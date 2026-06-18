import {
  Award,
  BarChart2,
  BookOpen,
  Briefcase,
  Calendar,
  Compass,
  FileCheck,
  GraduationCap,
  LayoutDashboard,
  MessageCircle,
  PlusCircle,
  ShieldCheck,
  Tag,
  UserCog,
  Users,
  Webhook,
  Wallet,
} from 'lucide-react';

export const STUDENT_MENU = [
  { section: 'Tổng quan' },
  { name: 'Bảng điều khiển', path: '/', icon: LayoutDashboard },
  { name: 'Khám phá', path: '/explore', icon: Compass },
  { name: 'Sự kiện', path: '/events', icon: Calendar },

  { section: 'Học tập' },
  { name: 'Học tập của tôi', path: '/my-learning', icon: GraduationCap },
  { name: 'Tiến trình', path: '/reports', icon: BarChart2 },
  { name: 'Chứng chỉ', path: '/certificates', icon: Award },

  { section: 'Tài khoản' },
  { name: 'Tin nhắn', path: '/messages', icon: MessageCircle },
  { name: 'Giảng viên', path: '/instructors', icon: Users },
  { name: 'Dạy học trên Skillio', path: '/become-instructor', icon: Briefcase },
  { name: 'Nạp ví', path: '/upgrade', icon: Wallet },
];

export const INSTRUCTOR_MENU = [
  { section: 'Tổng quan' },
  { name: 'Dashboard giảng viên', path: '/instructor/dashboard', icon: LayoutDashboard },

  { section: 'Quản lý nội dung' },
  { name: 'Khóa học của tôi', path: '/instructor/courses', icon: Briefcase },
  { name: 'Tạo khóa học mới', path: '/instructor/courses/new', icon: PlusCircle },
  { name: 'Mã giảm giá', path: '/instructor/vouchers', icon: Tag },
  { name: 'Quản lý sự kiện', path: '/instructor/events', icon: Calendar },

  { section: 'Doanh thu' },
  { name: 'Ví doanh thu', path: '/instructor/wallet', icon: Wallet },

  { section: 'Khác' },
  { name: 'Tin nhắn', path: '/messages', icon: MessageCircle },
];

export const ADMIN_MENU = [
  { section: 'Tổng quan' },
  { name: 'Dashboard Admin', path: '/', icon: LayoutDashboard },

  { section: 'Quản lý hệ thống' },
  { name: 'Quản lý người dùng', path: '/admin/users', icon: UserCog },
  { name: 'Duyệt khóa học', path: '/admin/courses', icon: FileCheck },
  { name: 'Mã giảm giá', path: '/admin/coupons', icon: Tag },
  { name: 'Đối soát giao dịch', path: '/admin/transactions', icon: Webhook },

  { section: 'Khác' },
  { name: 'Khám phá', path: '/explore', icon: Compass },
  { name: 'Tin nhắn', path: '/messages', icon: MessageCircle },
  { name: 'Bảo mật', path: '/admin/security', icon: ShieldCheck },
  { name: 'Nạp ví', path: '/upgrade', icon: Wallet },
];

export const getMenuByRole = (role) => {
  let menu;
  switch (role) {
    case 'INSTRUCTOR':
      menu = INSTRUCTOR_MENU;
      break;
    case 'ADMIN':
      menu = ADMIN_MENU;
      break;
    default:
      menu = STUDENT_MENU;
  }

  return menu.filter((item, index) => !item.section || (menu[index + 1] && !menu[index + 1].section));
};
