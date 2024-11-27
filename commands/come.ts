import { Bot } from 'mineflayer'
import consola from 'consola'
import pathfinder from 'mineflayer-pathfinder'

export async function comeHandler(bot: Bot, username: string): Promise<void> {
  const player = bot.players[username]
  if (player === undefined) {
    return
  }
  
  if (player.entity === undefined) {
    bot.chat(`I can't see you, ${username}`)
    return
  }
  
  consola.info(`coming to ${username} at ${player.entity.position.x}, ${player.entity.position.y}, ${player.entity.position.z}`)
  const position = player.entity.position
  
  bot.pathfinder.setGoal(
    new pathfinder.goals.GoalNear(position.x, position.y, position.z, 0.5),
    true
  )
}
