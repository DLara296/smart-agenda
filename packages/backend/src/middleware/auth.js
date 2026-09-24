function requireRole(allowedRoles) {
  return (req, res, next) => {
    const role = req.header('x-user-role');
    if (!role) {
      return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } });
    }
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have permission to access this resource.' } });
    }
    req.user = { role, familyId: req.header('x-family-id') || null };
    return next();
  };
}

function requireFamilyScope(req, res, next) {
  if (req.user.role !== 'guest' || req.user.familyId !== req.params.id) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'The requested family is outside your access scope.' } });
  }
  return next();
}

module.exports = { requireRole, requireFamilyScope };
