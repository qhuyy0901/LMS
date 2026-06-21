using LMS.Api.Domain.Entities;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace LMS.Api.Areas.GiangVien.ViewModels;

public class KhoaHocFormViewModel
{
    public KhoaHoc KhoaHoc { get; set; } = new();
    public SelectList? DanhSachDanhMuc { get; set; }
}
