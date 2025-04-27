/**
 * Converte webhooks e endpoints do agente em functions/tools para OpenAI
 * @param {Object} agent
 * @returns {Array} Lista de tools/functions no formato OpenAI
 */
export function agentToFunctions(agent) {
  const functions = [];
  // Webhooks
  if (Array.isArray(agent.webhook) && agent.webhook.length > 0) {
    agent.webhook.forEach(w => {
      const item = w.item || {};
      functions.push({
        name: (item.nome || '').replace(/\s/g, '_').toLowerCase(),
        description: item.contexto || `Executa o webhook ${item.nome}`,
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      });
    });
  }
  // Endpoints
  if (Array.isArray(agent.endpoints) && agent.endpoints.length > 0) {
    agent.endpoints.forEach(e => {
      const item = e.item || {};
      const plataforma = item.plataforma || {};
      const name = (plataforma.nome || 'endpoint').replace(/\s/g, '_').toLowerCase();
      const description = `Chama o endpoint da plataforma ${plataforma.nome || ''} (${item.url || ''})`;
      functions.push({
        name,
        description,
        parameters: {
          type: 'object',
          properties: {
            chave_api: { type: 'string', description: 'Chave de API para autenticação' },
            url: { type: 'string', description: 'URL do endpoint' }
          },
          required: ['chave_api', 'url'],
          additionalProperties: false
        }
      });
    });
  }
  return functions;
}

/**
 * Retorna a chave OpenAI do agente (se houver)
 * @param {Object} agent
 * @returns {string|null}
 */
export function getAgentOpenAIKey(agent) {
  return agent?.chave_openai?.chave_api || null;
}

/**
 * Prepara o prompt do sistema com instruções e base de conhecimento
 * @param {Object} agent 
 * @returns {string}
 */
export function buildSystemPrompt(agent) {
  const prompt = agent.instrucoes || '';
  const artigos = Array.isArray(agent.artigos) ? agent.artigos
    .map(a => {
      const item = a.item || {};
      return `\n---\n${item.titulo ? `Título: ${item.titulo}\n` : ''}${item.conteudo || ''}`;
    }).join('') : '';
  
  return prompt + (artigos.trim() ? `\n\nBase de conhecimento:\n${artigos}` : '');
}
