# Directus Extension: Agente IA (module-agente-ia)

Extensão para Directus que integra agentes de IA baseados em modelos OpenAI (ex: GPT-4o-mini), permitindo chats inteligentes, uso de funções dinâmicas (webhooks/endpoints), histórico de conversas e integração com collections customizadas.

## 📦 Estrutura dos Arquivos

- `ChatAgente.vue` — Componente Vue principal do chat, responsável por:
  - Interface de chat com o agente
  - Montagem do prompt do sistema
  - Envio de mensagens para a API da OpenAI
  - Execução de funções (function_call)
  - Gerenciamento do histórico de mensagens
- `module.vue` — Tela principal dos agentes, lista agentes ativos, históricos, permite acessar o chat.
- `utils.js` — Funções utilitárias para:
  - Converter webhooks/endpoints em funções OpenAI
  - Montar o prompt do sistema
  - Buscar chave OpenAI do agente
- `index.js` — Exporta o módulo para o Directus


## 🚀 Instalação

1. **Pré-requisitos:**
   - Projeto Directus rodando com extensões customizadas habilitadas
   - Node.js >= 16
   - API Key da OpenAI válida

2. **Clone/Copie este diretório para dentro de**
   ```
   directus/extensions/directus-extension-bundle-agent/src/module-agente-ia
   ```

3. **Instale as dependências do bundle principal:**
   ```bash
   cd directus/extensions/directus-extension-bundle-agent
   npm install
   ```

4. **Build do bundle:**
   ```bash
   npm run build
   ```

5. **Reinicie o Directus:**
   ```bash
   docker compose restart
   # ou
   npx directus start
   ```

6. **Acesse a interface do Directus e navegue até Agentes de IA.**


## ⚙️ Scripts

Os scripts são definidos no `package.json` do bundle principal:

- `npm run build` — Faz o build das extensões customizadas para uso no Directus.
- `npm install` — Instala as dependências do bundle.


## 🧩 Como funciona

- Cada agente pode ter:
  - Instruções customizadas
  - Artigos/base de conhecimento
  - Webhooks e endpoints (convertidos em funções OpenAI)
  - Chave OpenAI própria
- O chat monta o prompt do sistema dinamicamente, envia para a OpenAI e trata respostas/function_call.
- O histórico é salvo na collection `chat_historico` (ver estrutura abaixo).

### Estrutura da collection `chat_historico`

```
- agente (uuid): id do agente relacionado
- finalizado (boolean): se o chat foi finalizado
- mensagens (json): objeto { mensagens: [ { autor, texto, timestamp } ] }
- date_created (datetime): data de criação
- date_updated (datetime): data de atualização
```
Exemplo de payload para salvar histórico:
```json
{
  "agente": "<id-do-agente>",
  "finalizado": true/false,
  "mensagens": { "mensagens": [ { "autor": "user", "texto": "...", "timestamp": "..." }, ... ] }
}
```


## 📚 Referências

- [Documentação Oficial do Directus](https://docs.directus.io/)
- [API OpenAI - Chat Completions](https://platform.openai.com/docs/api-reference/chat)
- [Vue.js 3](https://vuejs.org/)


## 🛠️ Dicas de Debug

- Use o console do navegador para ver logs do payload enviado e resposta da OpenAI.
- Certifique-se que o campo `instrucoes` do agente está preenchido.
- Verifique se a chave OpenAI está correta e ativa.
- Para logs de erro, veja o console do Directus e do navegador.

---

**Dúvidas ou sugestões? Abra uma issue no repositório do projeto!**
