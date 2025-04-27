<template>
  <div v-if="show" class="chat-fullscreen">
    <div class="chat-header">
      <div class="header-left">
        <VIcon name="account_circle" size="32" color="var(--theme--primary)" style="margin-right:10px;" />
        <span class="chat-title">{{ agente.nome }}</span>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <button v-if="salvarHistorico._histId && !historicoFinalizado" class="finalizar-btn" @click="emit('finalizar-chat', salvarHistorico._histId)">
          <VIcon name="check" size="20" /> Finalizar
        </button>
        <button class="close-btn" @click="emit('update:show', false)">
          <VIcon name="close" size="24" />
        </button>
      </div>
    </div>
    <div class="chat-content">
      <div v-if="!mensagens.length" class="empty-msg">Como posso ajudar?</div>
      <div v-for="(msg, idx) in mensagens" :key="idx" :class="['msg', msg.autor]">
        <span class="msg-user" v-if="msg.autor==='user'">Você:</span>
        <span class="msg-agent" v-else>{{ agente.nome }}:</span>
        <span>{{ msg.texto }}</span>
      </div>
    </div>
    <div class="chat-input-bar">
      <input
        v-model="mensagem"
        class="chat-input"
        type="text"
        placeholder="Pergunte alguma coisa"
        @keyup.enter="enviarMensagem"
      />
      <button class="send-btn" @click="enviarMensagem">
        <VIcon name="send" size="22" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { agentToFunctions, buildSystemPrompt } from './utils.js';
// import OpenAI from 'openai'; // Não é necessário pois usamos fetch

const props = defineProps({
  agente: { type: Object, required: true },
  show: { type: Boolean, required: true },
  historicoId: { type: [String, null], default: null },
});
const emit = defineEmits(['update:show', 'finalizar-chat']);

const mensagem = ref('');
const mensagens = ref([]);
const historicoFinalizado = ref(false);

function getHistKey() {
  return `chat-historico-${props.agente?.id || 'default'}`;
}

async function carregarHistorico() {
  if (!props.agente) return;
  salvarHistorico._histId = null;
  
  // Se veio id de histórico, busca por ele
  if (props.historicoId) {
    const res = await fetch(`/items/chat_historico/${props.historicoId}?fields=mensagens,finalizado`, {
      headers: {
        ...(localStorage.getItem('directus_token') ? { 'Authorization': `Bearer ${localStorage.getItem('directus_token')}` } : {})
      }
    });
    const data = await res.json();
    mensagens.value = data.data?.mensagens?.mensagens || [];
    salvarHistorico._histId = data.data?.id;
    historicoFinalizado.value = !!data.data?.finalizado;
    return;
  }
  // Caso contrário, busca histórico aberto do agente
  const agenteId = props.agente.id;
  const res = await fetch(`/items/chat_historico?filter[agente][_eq]=${agenteId}&filter[finalizado][_eq]=false&fields=mensagens`, {
    
  });
  const data = await res.json();
  if (data.data && data.data.length) {
    mensagens.value = data.data[0].mensagens?.mensagens || [];
    salvarHistorico._histId = data.data[0].id;
    historicoFinalizado.value = !!data.data[0].finalizado;
  } else {
    mensagens.value = [];
    historicoFinalizado.value = false;
  }
}

async function salvarHistorico(finalizar = false) {
  if (!props.agente) return;
  
  const agenteId = props.agente.id;
  const mensagensPayload = { mensagens: mensagens.value };
  const payload = {
    agente: agenteId,
    mensagens: mensagensPayload,
    finalizado: finalizar,
  };
  // Verifica se já existe histórico aberto para este agente
  if (!salvarHistorico._histId) {
    // Busca histórico não finalizado
    const res = await fetch(`/items/chat_historico?filter[agente][_eq]=${agenteId}&filter[finalizado][_eq]=false`, {
      headers: {
        ...(localStorage.getItem('directus_token') ? { 'Authorization': `Bearer ${localStorage.getItem('directus_token')}` } : {})
      }
    });
    const data = await res.json();
    if (data.data && data.data.length) {
      salvarHistorico._histId = data.data[0].id;
    }
  }
  if (salvarHistorico._histId) {
    // Atualiza histórico existente
    await fetch(`/items/chat_historico/${salvarHistorico._histId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('directus_token') ? { Authorization: `Bearer ${localStorage.getItem('directus_token')}` } : {})
      },
      body: JSON.stringify(payload)
    });
  } else {
    // Cria novo histórico
    const res = await fetch('/items/chat_historico', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('directus_token') ? { Authorization: `Bearer ${localStorage.getItem('directus_token')}` } : {})
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.data && data.data.id) salvarHistorico._histId = data.data.id;
  }
}


watch(() => props.show, (val) => {
  if (val) {
    carregarHistorico();
  } else {
    mensagens.value = [];
    historicoFinalizado.value = false;
  }
});

watch(() => props.historicoId, (id) => {
  if (props.show && id) carregarHistorico();
});

watch(mensagens, salvarHistorico, { deep: true });

function montarContextoAgenteOpenAI(agente) {
  const contexto = {};
  if (agente.instrucoes) contexto.instrucoes = agente.instrucoes;
  if (Array.isArray(agente.artigos) && agente.artigos.length > 0) {
    contexto.artigos = agente.artigos
      .map(a => a.item)
      .filter(Boolean)
      .map(({ titulo, conteudo }) => ({ titulo, conteudo }));
  }
  if (Array.isArray(agente.endpoints) && agente.endpoints.length > 0) {
    contexto.endpoints = agente.endpoints
      .map(e => e.item)
      .filter(Boolean)
      .map(({ plataforma, url, metodo, nome, descricao }) => ({
        nome: plataforma?.nome || nome,
        descricao: descricao || url || ''
      }));
  }
  if (Array.isArray(agente.webhook) && agente.webhook.length > 0) {
    contexto.webhook = agente.webhook
      .map(w => w.item)
      .filter(Boolean)
      .map(({ nome, contexto: ctx, descricao }) => ({
        nome,
        descricao: descricao || ctx || ''
      }));
  }
  return contexto;
}

async function enviarMensagem() {
  if (historicoFinalizado.value) return;
  if (!mensagem.value.trim()) return;
  const userMsg = { autor: 'user', texto: mensagem.value, timestamp: new Date().toISOString() };
  mensagens.value.push(userMsg);
  salvarHistorico();

  const pergunta = mensagem.value;
  mensagem.value = '';

  mensagens.value.push({ autor: 'agente', texto: '...', timestamp: new Date().toISOString() });

  // Centraliza a montagem do prompt do sistema via utilitário
  const systemMessage = {
    role: 'system',
    content: buildSystemPrompt(props.agente)
  };

  const messagesOpenAI = [
    systemMessage,
    ...mensagens.value
      .filter(m => m.autor !== 'agente' || m.texto !== '...')
      .map(msg => ({
        role: msg.autor === 'user' ? 'user' : 'assistant',
        content: msg.texto
      })),
    { role: 'user', content: pergunta }
  ];

  let resposta = '[Sem resposta do agente]';
  try {
    const openaiKey = props.agente?.chave_openai?.chave_api;
    if (!openaiKey) throw new Error('Chave OpenAI não encontrada para este agente');

    // Gera tools (funções) do agente
    const tools = agentToFunctions(props.agente).map(f => ({
      type: 'function',
      function: f
    }));

    // Prepara payload com tools (contexto já está na mensagem system)
    let payload = {
      model: 'gpt-4o-mini',
      messages: messagesOpenAI,
      temperature: 0.7,
      max_tokens: 1000,
      functions: tools.length ? tools : undefined
    };

    // Remove undefined
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    console.log('Payload enviado ao OpenAI:', payload);
    // Chama OpenAI
    let res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify(payload)
    });
    let data = await res.json();
    console.log('Resposta OpenAI:', data);
    const choice = data.choices?.[0];

    // Se a resposta for function_call
    if (choice && choice.finish_reason === 'function_call' && choice.message?.function_call) {
      const { name, arguments: args } = choice.message.function_call;
      // Simula execução da função (mock)
      let result = `[Função '${name}' chamada com argumentos: ${args}]`;
      // Adiciona mensagem de resultado da função
      const messagesWithFunctionResult = [
        ...messagesOpenAI,
        {
          role: 'assistant',
          content: null,
          function_call: { name, arguments: args }
        },
        {
          role: 'function',
          name,
          content: result
        }
      ];
      // Chama novamente o modelo para obter resposta final
      payload = {
        model: 'gpt-4o-mini',
        messages: messagesWithFunctionResult,
        temperature: 0.7,
        max_tokens: 1000
      };
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify(payload)
      });
      data = await res.json();
      resposta = data.choices?.[0]?.message?.content || '[Sem resposta do agente após function_call]';
    } else {
      resposta = choice?.message?.content || '[Sem resposta do agente]';
    }
  } catch (err) {
    console.error('Erro ao chamar OpenAI:', err);
    resposta = '[Erro ao obter resposta do agente]';
  }

  // Substitui o "..." pela resposta real
  const idx = mensagens.value.findIndex(m => m.autor === 'agente' && m.texto === '...');
  if (idx !== -1) {
    mensagens.value[idx] = { autor: 'agente', texto: resposta, timestamp: new Date().toISOString() };
  } else {
    mensagens.value.push({ autor: 'agente', texto: resposta, timestamp: new Date().toISOString() });
  }
  salvarHistorico();
}


</script>

<style scoped>
.chat-fullscreen {
  position: absolute;
  top: var(--content-top, 56px);
  left: 0;
  width: 100%;
  height: calc(100vh - 56px);
  background: var(--theme--background, #18181a);
  display: flex;
  flex-direction: column;
  z-index: 2;
}
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26px 28px 12px 28px;
  border-bottom: 1px solid var(--theme--border-subdued,#22222a);
  background: var(--theme--background, #18181a);
}
.header-left {
  display: flex;
  align-items: center;
}
.chat-title {
  font-size: 1.18rem;
  font-weight: 600;
  color: var(--theme--primary-text, #fff);
}
.close-btn {
  background: none;
  border: none;
  outline: none;
  cursor: pointer;
  color: var(--theme--primary-text,#fff);
  padding: 4px 8px;
  border-radius: 50%;
  transition: background .2s;
}
.close-btn:hover {
  background: rgba(120,120,120,0.12);
}
.chat-content {
  flex: 1 1 auto;
  padding: 32px 28px 24px 28px;
  overflow-y: auto;
  background: var(--theme--background, #18181a);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.empty-msg {
  color: #aaa;
  text-align: center;
  font-size: 1.1rem;
  margin-top: 36px;
}
.msg {
  align-self: flex-start;
  max-width: 80%;
  margin: 2px 0;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 1.02rem;
  background: var(--theme--background-subdued,#23232a);
  color: #eee;
  line-height: 1.5;
}
.msg.user {
  align-self: flex-end;
  background: #4f46e5;
  color: #fff;
}
.msg-user {
  color: #b8b8ff;
  font-weight: 500;
  margin-right: 4px;
}
.msg-agent {
  color: #a8a8a8;
  font-weight: 500;
  margin-right: 4px;
}
.chat-input-bar {
  display: flex;
  align-items: center;
  padding: 22px 28px 28px 28px;
  border-top: 1px solid var(--theme--border-subdued,#22222a);
  background: var(--theme--background, #18181a);
}
.chat-input {
  flex: 1 1 auto;
  font-size: 1.12rem;
  padding: 13px 16px;
  border-radius: 7px;
  border: none;
  outline: none;
  background: var(--theme--background-subdued,#23232a);
  color: #fff;
  margin-right: 10px;
}
.chat-input::placeholder {
  color: #aaa;
}
.send-btn {
  background: #4f46e5;
  border: none;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  transition: background .2s;
}
.send-btn:hover {
  background: #3730a3;
}
</style>
