# Track By Track

Aplicação web para avaliação de faixas de álbuns musicais, permitindo que usuários avaliem faixas individualmente e acompanhem suas avaliações.

## Funcionalidades

- Autenticação com Spotify
- Visualização dos álbuns e artistas mais populares
- Busca de álbuns e artistas
- Avaliação de faixas de álbuns
- Visualização e filtragem das avaliações realizadas
- Sincronização de avaliações com o servidor

## Tecnologias Utilizadas

- React 19
- React Router 7
- TailwindCSS
- Vite
- Spotify API
- LocalStorage para persistência de dados

## Estrutura do Projeto

```
src/
├── componentes/            # Componentes de interface
│   ├── Avaliacao/          # Componentes de avaliação
│   ├── BarraDePesquisa/    # Componente de pesquisa
│   ├── Feed/               # Componentes de feed
│   │   ├── Cards/          # Cartões de álbuns
│   │   ├── Filtros/        # Filtros de conteúdo
│   ├── sidebar/            # Menu lateral
├── hooks/                  # Hooks customizados
├── services/               # Serviços e API
├── App.tsx                 # Componente principal
├── main.tsx               # Ponto de entrada da aplicação
└── index.css              # Estilos globais
```

## Componentes Principais

### MinhasAvaliacoes

Exibe os álbuns avaliados pelo usuário, com opções de filtragem por nota e pesquisa por nome ou artista.

### DetalhesAlbum

Exibe detalhes de um álbum específico e permite avaliar as faixas.

### Feed

Componente central que gerencia a exibição de conteúdo com base na seleção do usuário.

## Serviços

### spotify.js

Comunicação com a API do Spotify para buscar informações de álbuns, artistas e faixas.

### auth.js

Gerenciamento de autenticação com o Spotify.

### avaliacoes.js

Funções para manipulação de avaliações de faixas e álbuns.

### sync.js

Sincronização de avaliações com o servidor.

## Instalação e Execução

```bash
# Instalar dependências
npm install

# Executar em modo de desenvolvimento
npm run dev

# Construir para produção
npm run build

# Visualizar versão de produção
npm run preview
```

## Configuração

Para utilizar a autenticação com o Spotify, é necessário configurar as variáveis de ambiente em um arquivo `.env`:

```
VITE_SPOTIFY_CLIENT_ID=seu_client_id
VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/callback
```

## Configuração CORS para Firebase Storage

Se você encontrar problemas de CORS ao fazer upload de imagens de perfil durante o desenvolvimento, é necessário configurar o Firebase Storage para aceitar solicitações do seu ambiente local:

1. Instale o Firebase CLI:

```bash
npm install -g firebase-tools
```

2. Faça login no Firebase:

```bash
firebase login
```

3. Configure o CORS no bucket do Firebase Storage:

```bash
gsutil cors set cors.json gs://trackbytrack-57ae6.firebasestorage.app
```

Para usar temporariamente armazenamento local durante o desenvolvimento (evitando problemas de CORS), a aplicação já contém uma solução alternativa que é ativada automaticamente quando está rodando em localhost.

## Licença

Este projeto está licenciado sob a licença MIT.

# Otimizações de Desempenho - Carregamento de Avaliações

## Melhorias Implementadas

Foram implementadas diversas otimizações para melhorar o desempenho do carregamento das avaliações de álbuns:

### 1. Sistema de Cache

- Implementado um sistema de cache em memória para armazenar informações de álbuns já carregados
- Os dados do cache também são salvos no localStorage para persistência entre sessões
- O cache tem uma validade de 7 dias para garantir dados atualizados quando necessário

### 2. Otimização no Processamento em Lote

- Aumentado o tamanho dos lotes de processamento de 3 para 8 álbuns por vez
- Reduzido o tempo de espera entre lotes de 1000ms para 500ms
- Isso diminui significativamente o tempo total de carregamento quando há muitos álbuns

### 3. Carregamento Progressivo

- Implementado um sistema de carregamento progressivo que exibe os álbuns à medida que são carregados
- Não é mais necessário esperar que todos os álbuns sejam carregados para começar a usar o aplicativo
- Adicionada uma barra de progresso para visualizar o andamento do carregamento

### 4. Melhorias na Interface

- Adicionado um botão de "Atualizar" para facilitar a recarga da lista de álbuns
- Componente de carregamento melhorado para aceitar mensagens personalizadas
- Feedback visual aprimorado durante o processo de carregamento

## Benefícios

- **Experiência do usuário melhorada**: Os usuários podem começar a interagir com os álbuns mais rapidamente
- **Menor consumo de API**: Menos chamadas à API do Spotify graças ao sistema de cache
- **Melhor feedback visual**: Os usuários têm uma indicação clara do progresso de carregamento
- **Menor tempo de espera**: Tempo de carregamento reduzido significativamente para usuários com muitos álbuns avaliados

## Arquivos Modificados

1. `src/services/avaliacoes.js` - Implementação do cache e otimização de lotes
2. `src/hooks/useAvaliacoes.js` - Implementação do carregamento progressivo
3. `src/componentes/Feed/MinhasAvaliacoes.jsx` - Adição da barra de progresso e UI aprimorada
4. `src/componentes/Feedback/Carregamento.jsx` - Melhorias no componente de carregamento

## Próximos Passos

Outras possíveis melhorias para o futuro:

- Implementar lazy loading para imagens de álbuns
- Adicionar virtualização para listas muito grandes de álbuns
- Criar um worker em segundo plano para pré-carregar detalhes de álbuns quando o usuário estiver ocioso
