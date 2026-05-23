import express from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

/* ──────────────────────────────────────────────────────────
 *  Shared helpers
 * ────────────────────────────────────────────────────────── */

const clampPage = (v) => Math.max(1, Number.parseInt(v, 10) || 1);
const clampPageSize = (v) => Math.min(100, Math.max(1, Number.parseInt(v, 10) || 20));

const couponSelect = {
  id: true,
  code: true,
  discountType: true,
  discountValue: true,
  minPurchaseAmount: true,
  maxDiscountAmount: true,
  startDate: true,
  endDate: true,
  isActive: true,
  usageLimit: true,
  usageCount: true,
  courseId: true,
  course: { select: { id: true, title: true, slug: true } },
  createdAt: true,
  updatedAt: true,
};

/**
 * Compute discount amount for a given coupon + course price.
 */
export const computeDiscount = (coupon, coursePrice) => {
  if (coupon.discountType === 'PERCENTAGE') {
    let discount = Math.floor((coursePrice * coupon.discountValue) / 100);
    if (coupon.maxDiscountAmount != null) {
      discount = Math.min(discount, coupon.maxDiscountAmount);
    }
    return Math.min(discount, coursePrice);
  }
  // FIXED_AMOUNT
  return Math.min(coupon.discountValue, coursePrice);
};

/**
 * Core validation logic shared by the validate endpoint and the purchase flow.
 * Returns { valid, coupon, error } object.
 */
export const validateCouponForCourse = async (code, courseId, coursePrice) => {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Ma giam gia khong hop le' };
  }

  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase().trim() } });

  if (!coupon) {
    return { valid: false, error: 'Ma giam gia khong ton tai' };
  }

  if (!coupon.isActive) {
    return { valid: false, error: 'Ma giam gia da bi vo hieu hoa' };
  }

  const now = new Date();
  if (coupon.startDate && now < new Date(coupon.startDate)) {
    return { valid: false, error: 'Ma giam gia chua toi thoi gian hieu luc' };
  }
  if (coupon.endDate && now > new Date(coupon.endDate)) {
    return { valid: false, error: 'Ma giam gia da het han' };
  }

  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, error: 'Ma giam gia da het luot su dung' };
  }

  if (coupon.courseId && coupon.courseId !== courseId) {
    return { valid: false, error: 'Ma giam gia khong ap dung cho khoa hoc nay' };
  }

  if (coupon.minPurchaseAmount > 0 && coursePrice < coupon.minPurchaseAmount) {
    return {
      valid: false,
      error: `Gia khoa hoc phai tu ${coupon.minPurchaseAmount} VND tro len de ap dung ma nay`,
    };
  }

  const discountAmount = computeDiscount(coupon, coursePrice);
  return { valid: true, coupon, discountAmount };
};

const writeAuditLog = async (req, { action, entityType, entityId = null, metadata = null }) => {
  try {
    const actor = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true },
    });
    await prisma.auditLog.create({
      data: {
        actorId: actor?.id || req.userId || null,
        actorEmail: actor?.email || null,
        action,
        entityType,
        entityId,
        metadata,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });
  } catch (err) {
    console.error('Audit log write failed (coupon):', err);
  }
};

/* ──────────────────────────────────────────────────────────
 *  PUBLIC: Validate coupon code (any logged-in user)
 * ────────────────────────────────────────────────────────── */

router.post('/validate', verifyToken, async (req, res) => {
  try {
    const { code, courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ valid: false, error: 'Thieu thong tin khoa hoc' });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, price: true } });
    if (!course) {
      return res.status(404).json({ valid: false, error: 'Khong tim thay khoa hoc' });
    }

    const result = await validateCouponForCourse(code, courseId, course.price);

    if (!result.valid) {
      return res.status(400).json({ valid: false, error: result.error });
    }

    return res.status(200).json({
      valid: true,
      discountAmount: result.discountAmount,
      discountType: result.coupon.discountType,
      discountValue: result.coupon.discountValue,
      finalPrice: Math.max(0, course.price - result.discountAmount),
      couponCode: result.coupon.code,
    });
  } catch (error) {
    console.error('Coupon validate error:', error);
    return res.status(500).json({ valid: false, error: 'Loi server khi xac minh ma giam gia' });
  }
});

/* ──────────────────────────────────────────────────────────
 *  ADMIN: List all coupons
 * ────────────────────────────────────────────────────────── */

router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { q, status } = req.query;
    const page = clampPage(req.query.page);
    const pageSize = clampPageSize(req.query.pageSize);

    const where = {
      ...(q ? { code: { contains: q.toUpperCase(), mode: 'insensitive' } } : {}),
      ...(status === 'active' ? { isActive: true } : status === 'inactive' ? { isActive: false } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        select: couponSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.coupon.count({ where }),
    ]);

    return res.status(200).json({
      items,
      total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Coupon list error:', error);
    return res.status(500).json({ message: 'Loi server khi tai danh sach ma giam gia' });
  }
});

/* ──────────────────────────────────────────────────────────
 *  ADMIN: Create coupon
 * ────────────────────────────────────────────────────────── */

router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const {
      code,
      discountType = 'PERCENTAGE',
      discountValue,
      minPurchaseAmount = 0,
      maxDiscountAmount = null,
      startDate = null,
      endDate = null,
      usageLimit = null,
      courseId = null,
    } = req.body;

    if (!code || !discountValue) {
      return res.status(400).json({ message: 'Ma giam gia va gia tri giam gia la bat buoc' });
    }

    const normalizedCode = code.toUpperCase().trim();

    if (!/^[A-Z0-9_-]{3,30}$/.test(normalizedCode)) {
      return res
        .status(400)
        .json({ message: 'Ma giam gia chi cho phep chu in hoa, so, dau gach ngang va gach duoi (3-30 ky tu)' });
    }

    if (!['PERCENTAGE', 'FIXED_AMOUNT'].includes(discountType)) {
      return res.status(400).json({ message: 'Loai giam gia khong hop le' });
    }

    const parsedValue = Number(discountValue);
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      return res.status(400).json({ message: 'Gia tri giam gia phai la so nguyen duong' });
    }

    if (discountType === 'PERCENTAGE' && parsedValue > 100) {
      return res.status(400).json({ message: 'Phan tram giam gia khong duoc vuot qua 100%' });
    }

    const existing = await prisma.coupon.findUnique({ where: { code: normalizedCode } });
    if (existing) {
      return res.status(409).json({ message: `Ma "${normalizedCode}" da ton tai trong he thong` });
    }

    if (courseId) {
      const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
      if (!course) {
        return res.status(404).json({ message: 'Khoa hoc khong ton tai' });
      }
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: normalizedCode,
        discountType,
        discountValue: parsedValue,
        minPurchaseAmount: Number(minPurchaseAmount) || 0,
        maxDiscountAmount: maxDiscountAmount != null ? Number(maxDiscountAmount) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        usageLimit: usageLimit != null ? Number(usageLimit) : null,
        courseId: courseId || null,
      },
      select: couponSelect,
    });

    await writeAuditLog(req, {
      action: 'COUPON_CREATED',
      entityType: 'Coupon',
      entityId: coupon.id,
      metadata: { code: coupon.code, discountType, discountValue: parsedValue },
    });

    return res.status(201).json(coupon);
  } catch (error) {
    console.error('Coupon create error:', error);
    return res.status(500).json({ message: 'Loi server khi tao ma giam gia' });
  }
});

/* ──────────────────────────────────────────────────────────
 *  ADMIN: Toggle coupon active/inactive
 * ────────────────────────────────────────────────────────── */

router.patch('/:id/toggle', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      return res.status(404).json({ message: 'Khong tim thay ma giam gia' });
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: { isActive: !coupon.isActive },
      select: couponSelect,
    });

    await writeAuditLog(req, {
      action: updated.isActive ? 'COUPON_ACTIVATED' : 'COUPON_DEACTIVATED',
      entityType: 'Coupon',
      entityId: id,
      metadata: { code: coupon.code, isActive: updated.isActive },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Coupon toggle error:', error);
    return res.status(500).json({ message: 'Loi server khi cap nhat trang thai ma giam gia' });
  }
});

/* ──────────────────────────────────────────────────────────
 *  ADMIN: Delete coupon
 * ────────────────────────────────────────────────────────── */

router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      return res.status(404).json({ message: 'Khong tim thay ma giam gia' });
    }

    await prisma.coupon.delete({ where: { id } });

    await writeAuditLog(req, {
      action: 'COUPON_DELETED',
      entityType: 'Coupon',
      entityId: id,
      metadata: { code: coupon.code },
    });

    return res.status(200).json({ message: 'Da xoa ma giam gia thanh cong' });
  } catch (error) {
    console.error('Coupon delete error:', error);
    return res.status(500).json({ message: 'Loi server khi xoa ma giam gia' });
  }
});

export default router;
