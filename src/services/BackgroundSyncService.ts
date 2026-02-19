export async function runBackgroundSync(
  tenantId: string
): Promise<{ synced: boolean }> {
  console.log(`Background sync for tenant ${tenantId}`);
  return { synced: true };
}
