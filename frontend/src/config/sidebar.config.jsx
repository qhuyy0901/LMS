import {
  Award,
  BarChart2,
  BookOpen,
  Briefcase,
  Calendar,
  Compass,
  DollarSign,
  FileCheck,
  GraduationCap,
  LayoutDashboard,
  PlayCircle,
  PlusCircle,
  Settings,
  ShieldCheck,
  Tag,
  UserCog,
  Users,
  Webhook,
} from 'lucide-react';

export const STUDENT_MENU = [
  { section: 'Tổng quan' },
  { name: 'Bảng điều khiển', path: '/', icon: LayoutDashboard },
  { name: 'Khám phá', path: '/explore', icon: Compass },
  { name: 'Sự kiện', path: '/events', icon: Calendar },

  { section: 'Học tập' },
  { name: 'Khóa học của tôi', path: '/my-courses', icon: BookOpen },
  { name: 'Lớp đang học', path: '/my-classes', icon: PlayCircle },
  { name: 'Tiến trình', path: '/reports', icon: BarChart2 },
  { name: 'Chứng chỉ', path: '/certificates', icon: Award },

  { section: 'Tài khoản' },
  { name: 'Giảng viên', path: '/instructors', icon: Users },
  { name: 'Dạy học trên Skillio', path: '/become-instructor', icon: Briefcase },
  { name: 'Cài đặt', path: '/settings', icon: Settings },
];

export const INSTRUCTOR_MENU = [
  { section: 'Tổng quan' },
  { name: 'Dashboard giảng viên', path: '/instructor/dashboard', icon: LayoutDashboard },

  { section: 'Quản lý nội dung' },
  { name: 'Khóa học của tôi', path: '/instructor/courses', icon: Briefcase },
  { name: 'Tạo khóa học mới', path: '/instructor/courses/new', icon: PlusCircle },
  { name: 'Danh sách học viên', path: '/instructor/students', icon: GraduationCap },
  { name: 'Quản lý sự kiện', path: '/instructor/events', icon: Calendar },

  { section: 'Doanh thu' },
  { name: 'Thống kê doanh thu', path: '/instructor/revenue', icon: DollarSign },

  { section: 'Khác' },
  { name: 'Cài đặt', path: '/settings', icon: Settings },
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
  { name: 'Bảo mật', path: '/admin/security', icon: ShieldCheck },
  { name: 'Cài đặt', path: '/settings', icon: Settings },
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

  const visibleMenu = menu.filter((item) => item.path !== '/settings');
  return visibleMenu.filter((item, index) => !item.section || (visibleMenu[index + 1] && !visibleMenu[index + 1].section));
};
