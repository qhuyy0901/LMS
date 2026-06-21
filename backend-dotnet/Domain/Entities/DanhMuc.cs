using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace LMS.Api.Domain.Entities;

public class DanhMuc
{
    [Key]
    public string Id { get; set; } = string.Empty;

    [Required(ErrorMessage = "Tên danh mục không được để trống")]
    [MaxLength(100)]
    public string Ten { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Slug { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? MoTa { get; set; }

    public bool HoatDong { get; set; } = true;

    public DateTime NgayTao { get; set; } = DateTime.UtcNow;
    public DateTime NgayCapNhat { get; set; } = DateTime.UtcNow;

    public ICollection<KhoaHoc> CacKhoaHoc { get; set; } = [];
}
