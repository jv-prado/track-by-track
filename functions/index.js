const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Origin", "Accept"],
  credentials: true,
});

admin.initializeApp();

/**
 * Função para criar tokens personalizados do Firebase para usuários do Spotify
 *
 * Esta função cria um token personalizado do Firebase Auth para usuários autenticados
 * com o Spotify, permitindo que eles acessem recursos protegidos pelo Firebase.
 */
exports.createCustomToken = functions.https.onRequest((request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Origin, Accept"
  );

  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  return cors(request, response, async () => {
    try {
      console.log("[INÍCIO] Função createCustomToken chamada");
      console.log("Headers da requisição:", request.headers);
      console.log(
        "Origem da requisição:",
        request.headers.origin || "Desconhecida"
      );

      // Verificar método HTTP
      if (request.method !== "POST") {
        console.error(`Método ${request.method} não permitido`);
        return response
          .status(405)
          .json({ error: "Método não permitido, use POST" });
      }

      // Obter dados da requisição
      const { spotifyUserId } = request.body;
      console.log("Corpo da requisição:", request.body);

      if (!spotifyUserId) {
        console.error("ID do usuário Spotify ausente no corpo da requisição");
        return response
          .status(400)
          .json({ error: "ID do usuário Spotify é obrigatório" });
      }

      console.log(
        `Gerando token personalizado para usuário Spotify: ${spotifyUserId}`
      );

      // Definir claims personalizadas para identificar o tipo de autenticação
      const additionalClaims = {
        provider: "spotify",
        spotifyId: spotifyUserId,
      };

      // Gerar token personalizado usando o ID do Spotify prefixado
      // O prefixo 'spotify_' é usado para diferenciar esses usuários
      const uid = `spotify_${spotifyUserId}`;

      try {
        // Verificar se o usuário já existe no Firebase Auth
        try {
          console.log("Verificando se o usuário já existe:", uid);
          const userRecord = await admin.auth().getUser(uid);
          console.log("Usuário já existe:", userRecord.uid);
          console.log(
            "Dados do usuário existente:",
            JSON.stringify(userRecord, null, 2)
          );

          // Mesmo se usuário existe, garantir que também existe no Firestore
          try {
            const userRef = admin.firestore().collection("usuarios").doc(uid);
            const doc = await userRef.get();

            if (!doc.exists) {
              console.log(
                "Usuário existe em Auth mas não em Firestore. Criando documento..."
              );
              await userRef.set({
                provider: "spotify",
                spotifyId: spotifyUserId,
                displayName:
                  userRecord.displayName || `Spotify User ${spotifyUserId}`,
                email: userRecord.email,
                photoURL: userRecord.photoURL,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastLogin: admin.firestore.FieldValue.serverTimestamp(),
                sincronizado: true,
              });
              console.log(
                "Documento Firestore criado para usuário existente:",
                uid
              );
            } else {
              console.log("Documento Firestore já existe para o usuário:", uid);
            }
          } catch (firestoreCheckError) {
            console.error(
              "Erro ao verificar/criar documento Firestore para usuário existente:",
              firestoreCheckError
            );
            console.error("Stack trace:", firestoreCheckError.stack);
          }
        } catch (userError) {
          console.log(
            "Erro ao buscar usuário:",
            userError.code,
            userError.message
          );

          if (userError.code === "auth/user-not-found") {
            // Criar o usuário se não existir
            console.log(
              "Usuário não encontrado. Criando novo usuário no Firebase Auth:",
              uid
            );
            try {
              const newUserRecord = await admin.auth().createUser({
                uid: uid,
                displayName: `Spotify User ${spotifyUserId}`,
                // Outros campos podem ser preenchidos posteriormente
              });
              console.log("Usuário criado com sucesso:", newUserRecord.uid);

              // Criar documento inicial no Firestore
              try {
                const userData = {
                  provider: "spotify",
                  spotifyId: spotifyUserId,
                  displayName: `Spotify User ${spotifyUserId}`,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  lastLogin: admin.firestore.FieldValue.serverTimestamp(),
                  sincronizado: true,
                };

                // Usar set com merge:true para não substituir dados existentes
                await admin
                  .firestore()
                  .collection("usuarios")
                  .doc(uid)
                  .set(userData, { merge: true });
                console.log("Documento Firestore inicial criado para:", uid);

                // Também criar na coleção usuariosSpotify para completar
                try {
                  await admin
                    .firestore()
                    .collection("usuariosSpotify")
                    .doc(spotifyUserId)
                    .set(
                      {
                        ...userData,
                        nome: `Spotify User ${spotifyUserId}`,
                        uid: uid,
                      },
                      { merge: true }
                    );
                  console.log(
                    "Documento usuariosSpotify criado para:",
                    spotifyUserId
                  );
                } catch (spotifyCollectionError) {
                  console.error(
                    "Erro ao criar documento na coleção usuariosSpotify:",
                    spotifyCollectionError
                  );
                }
              } catch (firestoreError) {
                console.error(
                  "Erro ao criar documento Firestore:",
                  firestoreError.code || "sem código",
                  firestoreError.message
                );
                console.error("Stack trace:", firestoreError.stack);
                // Continuar mesmo com erro de Firestore
              }
            } catch (createError) {
              console.error(
                "Erro ao criar usuário:",
                createError.code,
                createError.message
              );
              console.error(
                "Detalhes completos:",
                JSON.stringify(createError, null, 2)
              );
              // Continuar mesmo com erro, pois ainda podemos gerar o token
            }
          } else {
            console.error(
              "Erro ao verificar usuário:",
              userError.code,
              userError.message
            );
          }
        }

        // Gerar o token personalizado para o usuário
        console.log("Gerando token personalizado para:", uid);
        const customToken = await admin
          .auth()
          .createCustomToken(uid, additionalClaims);

        console.log(`Token personalizado gerado com sucesso para ${uid}`);

        // Atualizar timestamp de último login
        try {
          await admin.firestore().collection("usuarios").doc(uid).update({
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log("Timestamp de login atualizado para:", uid);
        } catch (updateError) {
          console.log(
            "Aviso: Não foi possível atualizar timestamp (pode ser primeira execução):",
            updateError.message
          );
          // Não interromper o fluxo por causa deste erro
        }

        // Retornar o token gerado
        return response.status(200).json({
          customToken,
          uid: uid,
          success: true,
        });
      } catch (error) {
        console.error(
          "Erro ao gerar token personalizado:",
          error.code,
          error.message
        );
        console.error("Stack trace:", error.stack);
        return response.status(500).json({
          error: "Falha ao gerar token personalizado",
          message: error.message,
          code: error.code,
          success: false,
        });
      }
    } catch (error) {
      console.error("Erro geral na função:", error.message);
      console.error("Stack trace:", error.stack);
      return response.status(500).json({
        error: "Erro interno do servidor",
        message: error.message,
        success: false,
      });
    }
  });
});

/**
 * Sincroniza os dados do usuário entre as coleções usuariosSpotify e usuarios
 *
 * Esta nova implementação usa uma API HTTP em vez de um trigger Firestore,
 * resolvendo problemas de compatibilidade com versões recentes do Firebase Functions.
 */
exports.syncSpotifyUser = functions.https.onRequest((request, response) => {
  // Adicionar headers CORS
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Origin, Accept"
  );

  // Handle OPTIONS preflight request
  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  return cors(request, response, async () => {
    try {
      console.log("[INÍCIO] Função syncSpotifyUser chamada");

      // Verificar método HTTP
      if (request.method !== "POST") {
        console.error(`Método ${request.method} não permitido`);
        return response
          .status(405)
          .json({ error: "Método não permitido, use POST" });
      }

      // Obter dados da requisição
      const { spotifyUserId, userData } = request.body;
      console.log("Corpo da requisição:", request.body);

      if (!spotifyUserId || !userData) {
        console.error(
          "ID do usuário Spotify ou dados ausentes no corpo da requisição"
        );
        return response.status(400).json({
          error: "ID do usuário Spotify e dados do usuário são obrigatórios",
        });
      }

      const firebaseUserId = `spotify_${spotifyUserId}`;

      // Criar objeto com dados para o usuário do Firebase
      const userDataForFirebase = {
        nome: userData.nome || userData.display_name || "Usuário Spotify",
        email: userData.email,
        foto_perfil: userData.foto_perfil || userData.imageUrl,
        provider: "spotify",
        spotifyId: spotifyUserId,
        ultima_atualizacao: admin.firestore.FieldValue.serverTimestamp(),
        data_sincronizacao: new Date().toISOString(),
      };

      // Verificar se o documento já existe
      const userRef = admin
        .firestore()
        .collection("usuarios")
        .doc(firebaseUserId);
      const doc = await userRef.get();

      if (!doc.exists) {
        userDataForFirebase.data_cadastro =
          admin.firestore.FieldValue.serverTimestamp();
        console.log(`Criando novo documento para usuário: ${firebaseUserId}`);
      } else {
        console.log(
          `Atualizando documento existente para usuário: ${firebaseUserId}`
        );
      }

      // Atualizar o documento correspondente na coleção usuarios
      await userRef.set(userDataForFirebase, { merge: true });

      console.log(
        `Sincronizado com sucesso: Spotify ID ${spotifyUserId} -> Firebase ID ${firebaseUserId}`
      );

      return response.status(200).json({
        success: true,
        message: "Usuário sincronizado com sucesso",
        uid: firebaseUserId,
      });
    } catch (error) {
      console.error("Erro ao sincronizar usuário:", error);
      return response.status(500).json({
        error: "Erro interno ao sincronizar usuário",
        message: error.message,
        success: false,
      });
    }
  });
});
