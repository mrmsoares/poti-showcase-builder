/**
 * Função principal do motor crawler usando Auto-Waiting e Page Object principles.
 *
 * @param startUrl URL de partida do job
 * @param isMock (Opcional) ativa o modo de teste para evitar abertura real de browsers em testes unitários.
 * @returns Set com a lista única de links a serem processados.
 */
export declare function crawlerEngine(startUrl: string, isMock?: boolean): Promise<Set<string>>;
//# sourceMappingURL=index.d.ts.map