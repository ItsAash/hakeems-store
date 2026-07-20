import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * One-off smoke test for the S3 file provider wired up in medusa-config.ts — uploads a
 * tiny in-memory file through the real file module service, prints the resulting public
 * URL, then deletes it again so it doesn't linger in the bucket.
 *
 *   npx medusa exec ./src/scripts/test-s3-upload.ts
 */
export default async function testS3Upload({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fileModuleService = container.resolve(Modules.FILE)

  const content = Buffer.from("Lopho Medusa S3 smoke test — " + new Date().toISOString()).toString("base64")

  const [result] = await fileModuleService.createFiles([
    {
      filename: "medusa-s3-smoke-test.txt",
      mimeType: "text/plain",
      content,
      access: "public",
    },
  ])

  logger.info(`Uploaded. id=${result.id}`)
  logger.info(`URL: ${result.url}`)

  await fileModuleService.deleteFiles([result.id])
  logger.info("Deleted smoke-test file.")
}
