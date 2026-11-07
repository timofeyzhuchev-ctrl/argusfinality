export type ArgusFaceRecord = {
  id: string;
  fullName: string;
  birthDate: string;
  schoolOrOrg: string;
  vkUrl: string;
};

export type ArgusFaceMatch =
  | { status: 'candidate'; record: ArgusFaceRecord; checked: number }
  | { status: 'no_match' | 'ambiguous'; checked: number }
  | { status: 'indexing'; indexed: number; total: number }
  | { status: 'disabled' | 'unavailable' | 'busy' | 'empty' | 'limit' | 'no_face' | 'multiple_faces' | 'poor_quality' };

export function faceMatchDescription(result: ArgusFaceMatch): string {
  switch (result.status) {
    case 'candidate': return 'Найдена похожая запись. Сверьте фотографии вручную.';
    case 'no_match': return `Среди ${result.checked} проверенных записей достаточно похожих лиц не найдено.`;
    case 'ambiguous': return 'В базе несколько похожих записей. Нужно проверить их вручную.';
    case 'indexing': return `Подготовлено ${result.indexed} из ${result.total} фотографий базы. Повторите поиск, чтобы продолжить подготовку.`;
    case 'no_face': return 'Лицо на снимке не найдено.';
    case 'multiple_faces': return 'На снимке несколько лиц. Загрузите фото с одним человеком.';
    case 'poor_quality': return 'Для сверки нужен более чёткий снимок с одним лицом анфас.';
    case 'empty': return 'В базе пока нет одобренных фотографий, подходящих для сравнения.';
    case 'limit': return 'В базе больше 100 одобренных записей. Поиск по всей базе в этой версии недоступен.';
    case 'busy': return 'Уже выполняется сверка. Повторите запрос после её завершения.';
    case 'disabled': return 'Сверка по фото пока не включена на сервере.';
    case 'unavailable': return 'Не удалось выполнить сверку с базой. Повторите позже.';
  }
}
