/**
 * Declares the persistence capability for qualifying VIP activity volume:
 * coin deposits plus delivered orders not paid with coins.
 */
export interface ActivityRepository {
  sumQualifiedVolumeSince(clientId: string, since: Date): Promise<number>
}
