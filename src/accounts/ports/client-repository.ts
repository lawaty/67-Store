/**
 * Declares client persistence capabilities for the application layer.
 */
import { Client } from "../domain/client"

export interface ClientRepository {
  save(client: Client): Promise<void>
  findById(id: string): Promise<Client | null>
}
