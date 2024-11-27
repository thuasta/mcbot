import { Bot } from 'mineflayer'
import fs from 'fs'
import path from 'path'
import consola from 'consola'
import pathfinder from 'mineflayer-pathfinder'
import { distance, ROOT_DIR, sleep } from '../utils/utils.js'
import { Vec3 } from 'vec3'

interface Coordinates {
    stand: Vec3 | null
    lever: Vec3 | null
    tree: Vec3 | null
}

const COORDS_FILE_PATH = path.join(ROOT_DIR, 'configs', 'tree_coords.json')
// if the file or directory does not exist, create it
if (!fs.existsSync(path.dirname(COORDS_FILE_PATH))) {
    fs.mkdirSync(path.dirname(COORDS_FILE_PATH), { recursive: true })
}

// Load coordinates from file
function loadCoordinates(): Coordinates {
    if (fs.existsSync(COORDS_FILE_PATH)) {
        const data = fs.readFileSync(COORDS_FILE_PATH, 'utf8')
        const coords = JSON.parse(data) as Coordinates
        // Ensure to convert any raw x, y, z objects into Vec3
        if (coords.stand) coords.stand = new Vec3(coords.stand.x, coords.stand.y, coords.stand.z)
        if (coords.lever) coords.lever = new Vec3(coords.lever.x, coords.lever.y, coords.lever.z)
        if (coords.tree) coords.tree = new Vec3(coords.tree.x, coords.tree.y, coords.tree.z)
        return coords
    }
    return { stand: null, lever: null, tree: null }
}

// Save coordinates to file
function saveCoordinates(coords: Coordinates): void {
    // Convert Vec3 back to plain objects before saving
    const saveData = {
        stand: coords.stand ? { x: coords.stand.x, y: coords.stand.y, z: coords.stand.z } : null,
        lever: coords.lever ? { x: coords.lever.x, y: coords.lever.y, z: coords.lever.z } : null,
        tree: coords.tree ? { x: coords.tree.x, y: coords.tree.y, z: coords.tree.z } : null
    }
    fs.writeFileSync(COORDS_FILE_PATH, JSON.stringify(saveData, null, 2), 'utf8')
}

// Command handler for "tree setstand"
export function handleSetStand(bot: Bot, x: number, y: number, z: number): void {
    const coords = loadCoordinates()
    coords.stand = new Vec3(x, y, z)
    saveCoordinates(coords)
    consola.info(`Stand position set to: ${x}, ${y}, ${z}`)
    bot.chat(`Stand position set to: ${x}, ${y}, ${z}`)
}

// Command handler for "tree setlever"
export function handleSetLever(bot: Bot, x: number, y: number, z: number): void {
    const coords = loadCoordinates()
    coords.lever = new Vec3(x, y, z)
    saveCoordinates(coords)
    consola.info(`Lever position set to: ${x}, ${y}, ${z}`)
    bot.chat(`Lever position set to: ${x}, ${y}, ${z}`)
}

export function handleSetTree(bot: Bot, x: number, y: number, z: number): void {
    const coords = loadCoordinates()
    coords.tree = new Vec3(x, y, z)
    saveCoordinates(coords)
    consola.info(`Tree position set to: ${x}, ${y}, ${z}`)
    bot.chat(`Tree position set to: ${x}, ${y}, ${z}`)
}

let treePlacingInterval: NodeJS.Timeout | null = null
let errCnt: Map<string, number> = new Map()
let checkHand = async function (bot: Bot, name: string): Promise<void> {
    const nowHand = bot.inventory.slots[bot.getEquipmentDestSlot('hand')]
    if (nowHand && nowHand.name !== name || !nowHand) {
        // await bot.unequip('hand')
        let flag = false
        for (const item of bot.inventory.slots) {
            if (item == null) continue
            if (item.name === name) {
                await bot.equip(item, 'hand')
                flag = true
            }
        }
        if (!flag) {
            let errCntNow = errCnt.get(name)
            if (!errCntNow) {
                errCntNow = 0
            }
            ++errCntNow;
            errCnt.set(name, errCntNow)

            if (errCntNow > 50) {
                consola.error(`No ${name} in inventory, stopping tree factory.`)
                bot.chat(`No ${name} in inventory, stopping tree factory.`)
                handleStop(bot)
                return
            }
            return
        }
    }
}
async function plantTree(bot: Bot, coords: any): Promise<void> {
    if (!coords.stand) {
        consola.warn('No stand position set.')
        return
    }
    if (!coords.lever) {
        consola.warn('No lever position set.')
        return
    }
    if (!coords.tree) {
        consola.warn('No tree position set.')
        return
    }
    if (distance(coords.stand, bot.entity.position) > 1
        || bot.pathfinder.isMoving() || bot.pathfinder.isMining()
        || bot.pathfinder.isBuilding()) {
        consola.debug('Bot is moving to stand position.')
        return
    }
    consola.info('Placing tree.')
    const leverBlock = bot.blockAt(coords.lever)
    // consola.log(leverBlock)
    if (leverBlock && leverBlock.getProperties().powered == true) {
        await bot.activateBlock(leverBlock)
        await sleep(1000)
    }
    const treeBlock = bot.blockAt(new Vec3(coords.tree.x, coords.tree.y + 1, coords.tree.z))
    // consola.log(treeBlock)
    const dirtBlock = bot.blockAt(coords.tree)
    if (dirtBlock) {
        if (treeBlock && treeBlock.type === 0) {
            await checkHand(bot, 'cherry_sapling')
            await bot.placeBlock(dirtBlock, new Vec3(0, 1, 0))
        } else if (treeBlock && treeBlock.type !== 0) {
            await checkHand(bot, 'bone_meal')
            await bot.activateBlock(treeBlock)
        }
    } else {
        consola.warn('No dirt block to place tree.')
        bot.chat('No dirt block to place tree.')
        handleStop(bot)
    }
}

// Command handler for "tree start"
export async function handleStart(bot: Bot): Promise<void> {
    errCnt.set('sapling', 0)
    errCnt.set('bone', 0)
    if (treePlacingInterval) {
        consola.warn('Block placing task is already running.')
        bot.chat('Block placing task is already running.')
        return
    }
    const coords = loadCoordinates()
    if (!coords.stand) {
        consola.warn('No stand position set.')
        return
    }
    if (!coords.lever) {
        consola.warn('No lever position set.')
        return
    }
    if (!coords.tree) {
        consola.warn('No tree position set.')
        return
    }
    consola.info(`Bot moving to tree stand position: ${coords.stand.x}, ${coords.stand.y}, ${coords.stand.z}`)
    bot.chat(`Bot moving to tree stand position: ${coords.stand.x}, ${coords.stand.y}, ${coords.stand.z}`)
    bot.pathfinder.setGoal(new pathfinder.goals.GoalNear(coords.stand.x, coords.stand.y, coords.stand.z, 0.1), true)
    // consola.log(bot.inventory.slots)
    //create a process to place block
    treePlacingInterval = setInterval(async () => {
        try {
            await plantTree(bot, coords)
        } catch (err) {
            consola.error(err)
        }
    }, 200)
}

// Command handler for "tree stop"
export async function handleStop(bot: Bot): Promise<void> {
    const coords = loadCoordinates()
    bot.pathfinder.stop()
    if (!treePlacingInterval) {
        consola.warn('Tree factory is not running.')
        bot.chat('Tree factory is not running.')
        return
    }
    clearInterval(treePlacingInterval)
    treePlacingInterval = null
    if (!coords.lever) {
        consola.warn('No lever position set.')
        return
    }
    const leverBlock = bot.blockAt(coords.lever)
    // consola.log(leverBlock)
    if (leverBlock && leverBlock.getProperties().powered == false) {
        await bot.activateBlock(leverBlock)
        await sleep(1000)
    }
    consola.info('Tree factory stopped.')
    bot.chat('Tree factory stopped.')
}

export function treeHandler(bot: Bot, message: string): void {
    const split = message.split(' ')
    split.shift()

    if (split[0] == 'setstand' && split.length === 4) {
        const x = Number(split[1])
        const y = Number(split[2])
        const z = Number(split[3])
        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            handleSetStand(bot, x, y, z)
        }
    }

    else if (split[0] == 'setlever' && split.length === 4) {
        const x = Number(split[1])
        const y = Number(split[2])
        const z = Number(split[3])
        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            handleSetLever(bot, x, y, z)
        }
    }

    else if (split[0] == 'settree' && split.length === 4) {
        const x = Number(split[1])
        const y = Number(split[2])
        const z = Number(split[3])
        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            handleSetTree(bot, x, y, z)
        }
    }

    else if (split[0] === 'start') {
        handleStart(bot)
    }

    else if (split[0] === 'stop') {
        handleStop(bot)
    }

    else {
        consola.warn(`Unknown tree command: ${message}`)
    }
}
