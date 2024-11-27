import consola from 'consola'
import 'dotenv/config'
import mineflayer from 'mineflayer'
import pathfinder from 'mineflayer-pathfinder'

import { mineflayer as mineflayerViewer } from 'prismarine-viewer'

interface Env {
  MC_HOST: string
  MC_USERNAME: string
  MC_AUTH: 'mojang' | 'microsoft' | 'offline'
  LOG_LEVEL: string
}

async function sleep (ms: number): Promise<void> {
  return await new Promise(resolve => setTimeout(resolve, ms))
}

async function main (): Promise<void> {
  const env: Env = process.env as any

  consola.level = Number(env.LOG_LEVEL)

  const bot = mineflayer.createBot({
    host: env.MC_HOST,
    username: env.MC_USERNAME,
    auth: env.MC_AUTH
  })
 

  bot.loadPlugin(pathfinder.pathfinder)

  bot.once('spawn', () => {
    const movement = new pathfinder.Movements(bot)
    movement.canDig = false
    movement.allow1by1towers = true
    movement.allowFreeMotion = true
    bot.pathfinder.setMovements(movement)
    mineflayerViewer(bot, { port: 3007, firstPerson: true }) // port is the minecraft server port, if first person is false, you get a bird's-eye view
  })

  bot.on('whisper', async (username: string, message: string) => {
    const player = bot.players[username]
    if (player === undefined) {
      return
    }

    if (message === 'come') {
      consola.info(`coming to ${username} at ${player.entity.position.x}, ${player.entity.position.y}, ${player.entity.position.z}`)

      const position = player.entity.position
      bot.pathfinder.setGoal(
        new pathfinder.goals.GoalNear(position.x, position.y, position.z, 0.5),
        true
      )
    }

    if (message.startsWith('gotoxz')) {
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
  })
}

main().catch(consola.error)
