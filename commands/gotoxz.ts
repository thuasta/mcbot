import { Bot } from 'mineflayer'
import consola from 'consola'
import pathfinder from 'mineflayer-pathfinder'
import { sleep } from '../utils/utils.js'

export async function gotoxzHandler(bot: Bot, message: string): Promise<void> {
    const split = message.split(' ')
    if (split.length !== 3) {
        return
    }
    if (isNaN(Number(split[1])) || isNaN(Number(split[2]))) {
        return
    }

    consola.info(`going to ${split[1]}, ${bot.entity.position.y}, ${split[2]}`)

    const goalX = Number(split[1])
    const goalZ = Number(split[2])

    // In every axis, the bot should not move more than 10 blocks at a time
    // If the goal is too far, the bot should move in smaller steps
    // First move in the x-axis, then the z-axis

    while (true) {
        while (bot.pathfinder.isMoving() || bot.pathfinder.isMining() || bot.pathfinder.isBuilding()) {
            await sleep(100)
        }

        if (Math.abs(bot.entity.position.x - goalX) < 10) {
            consola.debug(`set goal to ${goalX}, ${bot.entity.position.y}, ${bot.entity.position.z}`)
            bot.pathfinder.setGoal(
                new pathfinder.goals.GoalNear(goalX, bot.entity.position.y, bot.entity.position.z, 0.5),
                true
            )
            break
        }

        const direction = goalX > bot.entity.position.x ? 1 : -1
        const subgoalX = 10 * direction + bot.entity.position.x

        consola.debug(`set goal to ${subgoalX}, ${bot.entity.position.y}, ${bot.entity.position.z}`)
        bot.pathfinder.setGoal(
            new pathfinder.goals.GoalNear(subgoalX, bot.entity.position.y, bot.entity.position.z, 0.5),
            true
        )

        await sleep(100)
    }

    while (true) {
        while (bot.pathfinder.isMoving() || bot.pathfinder.isMining() || bot.pathfinder.isBuilding()) {
            await sleep(100)
        }

        if (Math.abs(bot.entity.position.z - goalZ) < 10) {
            consola.debug(`set goal to ${bot.entity.position.x}, ${bot.entity.position.y}, ${goalZ}`)
            bot.pathfinder.setGoal(
                new pathfinder.goals.GoalNear(bot.entity.position.x, bot.entity.position.y, goalZ, 0.5),
                true
            )
            break
        }

        const direction = goalZ > bot.entity.position.z ? 1 : -1
        const subgoalZ = 10 * direction + bot.entity.position.z

        consola.debug(`set goal to ${bot.entity.position.x}, ${bot.entity.position.y}, ${subgoalZ}`)
        bot.pathfinder.setGoal(
            new pathfinder.goals.GoalNear(bot.entity.position.x, bot.entity.position.y, subgoalZ, 0.5),
            true
        )

        await sleep(100)
    }
}
