import consola from "consola"

export async function sleep(ms: number): Promise<void> {
    return await new Promise(resolve => setTimeout(resolve, ms))
}

export const ROOT_DIR = process.cwd()
consola.info(`ROOT_DIR: ${ROOT_DIR}`)

//calculate distance between two mineflayer positions
export function distance(pos1: any, pos2: any): number {
    return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2 + (pos1.z - pos2.z) ** 2)
}
