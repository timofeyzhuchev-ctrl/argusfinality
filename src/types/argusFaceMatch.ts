export type ArgusFaceRecord = {
  id: string;
  fullName: string;
  birthDate: string;
  schoolOrOrg: string;
  vkUrl: string;
};
export const MAX_ARGUS_REVIEW_CANDIDATES = 5;
export type ArgusReviewCandidate = Pick<ArgusFaceRecord, 'id' | 'fullName' | 'birthDate'>;

export type ArgusFaceMatch =
  | { status: 'candidate'; record: ArgusFaceRecord; checked: number }
  | { status: 'exact_file'; record: ArgusFaceRecord }
  | { status: 'no_match'; checked: number }
  | { status: 'ambiguous'; reason: 'duplicate_file' | 'similar_faces'; candidates: ArgusReviewCandidate[] }
  | { status: 'indexing'; indexed: number; total: number }
  | { status: 'pending_photo' | 'rejected_photo' | 'disabled' | 'unavailable' | 'busy' | 'empty' | 'limit' | 'no_face' | 'multiple_faces' | 'poor_quality' };

export function hasArgusFaceRecord(result?: ArgusFaceMatch): result is Extract<ArgusFaceMatch, { record: ArgusFaceRecord }> {
  return result?.status === 'candidate' || result?.status === 'exact_file';
}

export function faceMatchDescription(result: ArgusFaceMatch): string {
  switch (result.status) {
    case 'candidate': return 'Найдена похожая запись. Сверьте фотографии вручную.';
    case 'exact_file': return 'Этот же файл сохранён в одобренной записи. Проверьте, что карточка относится к человеку на снимке.';
    case 'pending_photo': return 'Этот снимок уже в заявке, которая ожидает проверки. Нажмите «Одобрить» и отправьте фото ещё раз.';
    case 'rejected_photo': return 'Этот снимок был в отклонённой заявке. Для поиска используются одобренные записи.';
    case 'no_match': return `Среди ${result.checked} проверенных записей достаточно похожих лиц не найдено.`;
    case 'ambiguous': return result.reason === 'duplicate_file'
      ? 'Тот же файл сохранён в нескольких одобренных карточках. Сверьте записи ниже.'
      : 'Найдено несколько похожих записей. Сравните фотографии в карточках ниже.';
    case 'indexing': return `Подготовлено ${result.indexed} из ${result.total} фотографий базы. Повторите поиск, чтобы продолжить подготовку.`;
    case 'no_face': return 'Лицо на снимке не найдено.';
    case 'multiple_faces': return 'На снимке несколько лиц. Загрузите фото с одним человеком.';
    case 'poor_quality': return 'Для сверки нужен более чёткий снимок с одним лицом анфас.';
    case 'empty': return 'В базе пока нет одобренных фотографий, подходящих для сравнения.';
    case 'limit': return 'В базе больше 100 одобренных записей. Поиск по всей базе в этой версии недоступен.';
    case 'busy': return 'Уже выполняется сверка. Повторите запрос после её завершения.';
    case 'disabled': return 'Сверка выключена. Задайте ARGUS_FACE_MATCH_ENABLED=true в Render и пересоберите сервис.';
    case 'unavailable': return 'Не удалось выполнить сверку с базой. Повторите позже.';
  }
}
