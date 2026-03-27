// Serviço de sincronização com Plus — placeholder
export const retailPlusSyncService = {
  async getPlusStatus() { return { connected: false }; },
  async syncAllPersonsToPlus(_tenantId: any, _empresaId: any) { return { synced: 0 }; },
  async syncSaleToPlus(_saleId: any) { return { synced: false }; },
  async emitirNFeSale(_saleId: any, _tipo?: string) { return { emitted: false }; },
  async importClientesFromPlus(_tenantId: any, _empresaId: any) { return { imported: 0 }; },
  async importProdutosFromPlus(_tenantId: any, _empresaId: any) { return { imported: 0 }; },
};
