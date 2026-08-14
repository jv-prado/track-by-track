/**
 * O nome do gênero no RSS da Apple é localizado por loja ("Alternative" em
 * `us`, "Alternativo" em `br`, "オルタナティブ" em `jp`) — só o `genreId` é
 * estável. Sem esta tradução, unir os charts de várias lojas criaria três
 * opções de filtro para o mesmo gênero. Ids e nomes canônicos vêm da própria
 * API de gêneros da Apple (`MZStoreServices/ws/genres?id=34`); só entram aqui
 * os que de fato aparecem nos charts de álbum.
 */
export const APPLE_GENRE_NAMES: Record<string, string> = {
  '2': 'Blues',
  '4': "Children's Music",
  '5': 'Classical',
  '6': 'Country',
  '7': 'Electronic',
  '10': 'Singer/Songwriter',
  '11': 'Jazz',
  '12': 'Latin',
  '13': 'New Age',
  '14': 'Pop',
  '15': 'R&B/Soul',
  '16': 'Soundtrack',
  '17': 'Dance',
  '18': 'Hip-Hop/Rap',
  '19': 'Worldwide',
  '20': 'Alternative',
  '21': 'Rock',
  '22': 'Christian',
  '23': 'Vocal',
  '24': 'Reggae',
  '25': 'Easy Listening',
  '27': 'J-Pop',
  '29': 'Anime',
  '51': 'K-Pop',
  '1122': 'Brazilian',
  '1153': 'Metal',
  '1223': 'Forró',
  '1225': 'MPB',
  '1228': 'Sertanejo',
  '1243': 'Korean',
  '1262': 'Indian',
  '1289': 'Folk',
  '50000064': 'French Pop',
  '50000066': 'German Pop',
};

/** Categoria guarda-chuva presente em quase todo item — não é gênero pro filtro. */
export const APPLE_GENERIC_GENRE_ID = '34';
