export const COURSE_CATEGORIES = [
  'Công nghệ',
  'Mạng máy tính',
  'Tiếng Anh',
  'Thiết kế',
  'Kinh doanh',
];

export const EXPLORE_CATEGORIES = [
  { label: 'Tất cả', value: '' },
  ...COURSE_CATEGORIES.map((category) => ({
    label: category,
    value: category,
  })),
];
