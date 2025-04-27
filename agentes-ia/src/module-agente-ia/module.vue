<template>
  <private-view title="Agentes de IA">
    <template #navigation>
      <div class="nav-block">
        <div class="nav-title">Conversas</div>
        <ul class="nav-historico-list" v-if="historicos.length">
          <li v-for="hist in historicos" :key="hist.id" @click="abrirHistorico(hist)" :class="{finalizado: hist.finalizado}">
            <span class="nav-hist-title">
              <b>{{ getAgentName(hist.agente).length > 100 ? getAgentName(hist.agente).slice(0, 100) + '...' : getAgentName(hist.agente) }}</b>
              <span v-if="hist.finalizado" class="nav-finalizado-label">Finalizado</span>
            </span>
            <span class="nav-hist-date">{{ formatDate(hist.date_created) }}</span>
          </li>
        </ul>
      </div>
    </template>
    <div class="content">
        <h2 class="subtitle">Agentes Ativos</h2>
        <div class="card-list">
          <VCard v-for="agent in agents" :key="agent.id" class="agent-card">
            <template #prepend>
              <VIcon name="account_circle" size="32" color="var(--theme--primary)" />
            </template>
            <VCardTitle>{{ agent.nome }}</VCardTitle>
            <VCardText>
              <span v-if="agent.descricao">{{ agent.descricao }}</span>
              <span v-else style="color: #aaa">Sem descrição</span>
            </VCardText>
            <VCardActions>
              <VButton color="primary" @click="acessarChat(agent)">
                Acessar Chat
              </VButton>
            </VCardActions>
          </VCard>
        </div>
        <div v-if="!agents.length" class="empty-msg">Nenhum agente ativo encontrado.</div>
      </div>
    <ChatAgente
      v-if="chatAberto && agenteSelecionado"
      :agente="agenteSelecionado"
      :show="chatAberto"
      @update:show="val => { chatAberto = val; if (!val) agenteSelecionado = null; }"
      @finalizar-chat="finalizarChatHistorico"
      :historico-id="historicoSelecionadoId"
    />
  </private-view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import ChatAgente from './ChatAgente.vue';



const agents = ref([]);
const chatAberto = ref(false);
const agenteSelecionado = ref(null);
const historicos = ref([]);
const historicoSelecionadoId = ref(null);

function getAgentName(agenteId) {
  const agent = agents.value.find(a => a.id === agenteId);
  return agent ? agent.nome : 'Agente';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function acessarChat(agent) {
  agenteSelecionado.value = agent;
  chatAberto.value = true;
  historicoSelecionadoId.value = null;
}

function abrirHistorico(hist) {
  const agent = agents.value.find(a => a.id === hist.agente);
  if (agent) {
    agenteSelecionado.value = agent;
    chatAberto.value = true;
    historicoSelecionadoId.value = hist.id;
  }
}

function finalizarChatHistorico(histId) {
  // Atualiza o status do histórico para finalizado
  const chave = agenteSelecionado.value?.chave_openai?.chave_api;
  fetch(`/items/chat_historico/${histId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: chave ? `Bearer ${chave}` : undefined
    },
    body: JSON.stringify({ finalizado: true })
  }).then(() => carregarHistoricos());
}

async function carregarHistoricos() {
  
  const res = await fetch(`/items/chat_historico?fields=id,agente,finalizado,date_created&sort[]=-date_created`, {
    
  });
  const data = await res.json();
  historicos.value = data.data || [];
}

onMounted(async () => {
  const res = await fetch('/items/agente?fields[]=id,nome,descricao,status,chave_openai.chave_api&filter[status][_eq]=true');
  const data = await res.json();
  agents.value = data.data || [];
  await carregarHistoricos();
});
</script>

<style scoped>
.content {
  flex: 1 1 0;
  padding: 32px 24px;
  min-width: 0;
  overflow-x: auto;
  margin-top: 0;
}

/* Ajuste para o chat respeitar o header/navigation */
:deep(.chat-agente-container),
:deep(.chat-agente-main),
:deep(.chat-agente-wrapper) {
  max-height: calc(100vh - 110px); /* Ajuste conforme altura do header/nav */
  overflow-y: auto;
  margin-top: 0;
}
.subtitle {
  color: var(--theme--primary-text, #3a3a4a);
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 20px;
  letter-spacing: 0.02em;
}
.card-list {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  justify-content: flex-start;
}
.agent-card {
  min-width: 240px;
  max-width: 300px;
  flex: 1 1 240px;
  margin-bottom: 24px;
  background: var(--theme--background-subdued, #fff);
}
.empty-msg {
  text-align: center;
  color: #888;
  margin-top: 32px;
  font-size: 1.1rem;
}
.nav-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background: var(--theme--background-subdued, #23232a);
  padding: 8px 16px 10px 16px;
  border-radius: 8px;
  margin-bottom: 8px;
  width: auto;
  max-width: 100vw;
  min-width: 0;
  box-sizing: border-box;
}
.nav-title {
  color: #fff;
  font-size: 1.0rem;
  font-weight: 600;
  margin: 7px;
  letter-spacing: 0.01em;
}
.nav-historico-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  list-style: none;
  margin: 0 5px;
  padding: 0;
  width: calc(100% - 10px);
  max-width: 100%;
  overflow-x: auto;
}
.nav-historico-list li {
  background: #23232a;
  border: 1px solid #3730a3;
  border-radius: 6px;
  padding: 5px 10px;
  color: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 90px;
  max-width: 170px;
  transition: background .2s, border .2s;
  font-size: 0.97em;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
.nav-historico-list li:hover {
  background: #3730a3;
  border: 1px solid #4f46e5;
}
.nav-historico-list li.finalizado {
  opacity: 0.6;
}
.nav-hist-title {
  display: flex;
  align-items: center;
  gap: 5px;
}
.nav-finalizado-label {
  background: #aaa;
  color: #23232a;
  font-size: 0.85em;
  border-radius: 5px;
  padding: 1px 5px;
  margin-left: 5px;
}
.nav-hist-date {
  color: #bbb;
  font-size: 0.91em;
  margin-top: 1px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

/* Remover sidebar antigo */
.sidebar-historico, .historico-navigation, .historico-label, .historico-list-nav, .historico-list-nav li, .historico-list-nav li.finalizado, .hist-title-nav, .finalizado-label-nav, .hist-date-nav {
  display: none !important;
}
.sidebar-historico h3 {
  margin: 0 0 16px 0;
  color: #fff;
  font-size: 1.08rem;
}
.historico-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.historico-list li {
  padding: 12px 10px;
  border-radius: 6px;
  margin-bottom: 8px;
  background: #23232a;
  cursor: pointer;
  transition: background .2s;
  border: 1px solid transparent;
}
.historico-list li:hover {
  background: #3730a3;
  border: 1px solid #4f46e5;
}
.historico-list li.finalizado {
  opacity: 0.6;
}
.hist-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
}
.finalizado-label {
  background: #aaa;
  color: #23232a;
  font-size: 0.88em;
  border-radius: 5px;
  padding: 2px 8px;
  margin-left: 8px;
}
.hist-date {
  color: #bbb;
  font-size: 0.95em;
  margin-top: 3px;
}

</style>
