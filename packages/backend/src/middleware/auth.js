function createAuthMiddleware(authService) {
  function requireRole(allowedRoles) {
  return (req, res, next) => {
    const sessionUser = authService.getUserByToken(parseCookie(req.headers.cookie, authService.sessionCookie));
    const testUser = process.env.NODE_ENV === 'test' && req.header('x-user-role') ? { role: req.header('x-user-role'), userId: req.header('x-user-id') || 'user-coordinator', familyId: req.header('x-family-id') || null } : null;
    const user = sessionUser || testUser;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have permission to access this resource.' } });
    }
    req.user = { ...user, userId: user.userId || user.id };
    return next();
  };
  }
  return { requireRole };
}

function parseCookie(header, name) {
  const value = (header || '').split(';').map(item => item.trim()).find(item => item.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : null;
}

function requireFamilyScope(req, res, next) {
  if (req.user.role !== 'guest') return next();
  if (req.user.familyId !== req.params.id) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'The requested family is outside your access scope.' } });
  }
  return next();
}

module.exports = { createAuthMiddleware, requireFamilyScope, parseCookie };
