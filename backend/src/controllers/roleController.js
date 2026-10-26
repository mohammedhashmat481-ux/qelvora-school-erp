import Role from '../models/Role.js';
import { escapeRegex, safeError, auditLog } from '../utils/security.js';

/**
 * Helper to normalize a Role document object
 */
const normalizeRole = (r) => {
  if (!r) return null;
  const obj = r.toObject ? r.toObject() : r;
  const activeStatus = obj.isActive !== undefined ? obj.isActive : (obj.isEnabled !== undefined ? obj.isEnabled : true);
  return {
    _id: obj._id,
    roleCode: obj.roleCode || obj.RoleCode || '',
    RoleCode: obj.roleCode || obj.RoleCode || '',
    roleName: obj.roleName || obj.Rolename || '',
    Rolename: obj.roleName || obj.Rolename || '',
    grantAdminPrivilege: obj.grantAdminPrivilege !== undefined ? obj.grantAdminPrivilege : (obj.GantAdminPrevillage !== undefined ? obj.GantAdminPrevillage : false),
    GantAdminPrevillage: obj.grantAdminPrivilege !== undefined ? obj.grantAdminPrivilege : (obj.GantAdminPrevillage !== undefined ? obj.GantAdminPrevillage : false),
    createdBy: obj.createdBy || obj.CreatedBy || 'System',
    CreatedBy: obj.createdBy || obj.CreatedBy || 'System',
    isActive: activeStatus,
    isEnabled: activeStatus
  };
};

/**
 * Get all roles
 */
export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ createdAt: 1 });
    const normalized = roles.map(normalizeRole);
    return res.status(200).json({ status: true, data: normalized });
  } catch (error) {
    return safeError(res, error, 'GetRoles');
  }
};

/**
 * Create a new role
 */
export const createRole = async (req, res) => {
  const { roleName, Rolename, grantAdminPrivilege, GantAdminPrevillage, isActive, isEnabled } = req.body;
  const finalRoleName = roleName || Rolename;
  const finalGrantAdminPrivilege = grantAdminPrivilege !== undefined ? grantAdminPrivilege : (GantAdminPrevillage !== undefined ? GantAdminPrevillage : false);
  const finalIsActive = isActive !== undefined ? isActive : (isEnabled !== undefined ? isEnabled : true);

  try {
    if (!finalRoleName) {
      return res.status(400).json({ status: false, message: 'Role name is required' });
    }

    const exists = await Role.findOne({
      $or: [
        { roleName: { $regex: new RegExp(`^${escapeRegex(finalRoleName)}$`, 'i') } },
        { Rolename: { $regex: new RegExp(`^${escapeRegex(finalRoleName)}$`, 'i') } }
      ]
    });
    if (exists) {
      return res.status(400).json({ status: false, message: `Role "${finalRoleName}" already exists` });
    }

    // Auto-generate role code
    const lastRole = await Role.findOne().sort({ createdAt: -1 });
    let nextNum = 1;
    const lastRoleCode = lastRole ? (lastRole.roleCode || lastRole.RoleCode) : null;
    if (lastRoleCode) {
      const match = lastRoleCode.match(/ROLE-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const roleCode = `ROLE-${String(nextNum).padStart(5, '0')}`;

    const role = await Role.create({
      roleCode,
      RoleCode: roleCode,
      roleName: finalRoleName,
      Rolename: finalRoleName,
      grantAdminPrivilege: finalGrantAdminPrivilege,
      GantAdminPrevillage: finalGrantAdminPrivilege,
      createdBy: req.user?.name || 'Admin',
      CreatedBy: req.user?.name || 'Admin',
      isActive: finalIsActive,
      isEnabled: finalIsActive
    });

    return res.status(201).json({ status: true, message: 'Role created successfully', data: normalizeRole(role) });
  } catch (error) {
    return safeError(res, error, 'CreateRole');
  }
};

/**
 * Update a role
 */
export const updateRole = async (req, res) => {
  const { id } = req.params;
  const { roleName, Rolename, grantAdminPrivilege, GantAdminPrevillage, isActive, isEnabled } = req.body;
  const finalRoleName = roleName || Rolename;
  const finalGrantAdminPrivilege = grantAdminPrivilege !== undefined ? grantAdminPrivilege : (GantAdminPrevillage !== undefined ? GantAdminPrevillage : undefined);
  const finalIsActive = isActive !== undefined ? isActive : (isEnabled !== undefined ? isEnabled : undefined);

  try {
    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ status: false, message: 'Role not found' });
    }

    if (finalRoleName) {
      role.roleName = finalRoleName;
      role.Rolename = finalRoleName;
    }
    if (finalGrantAdminPrivilege !== undefined) {
      role.grantAdminPrivilege = finalGrantAdminPrivilege;
      role.GantAdminPrevillage = finalGrantAdminPrivilege;
    }
    if (finalIsActive !== undefined) {
      role.isActive = finalIsActive;
      role.isEnabled = finalIsActive;
    }

    await role.save();
    return res.status(200).json({ status: true, message: 'Role updated successfully', data: normalizeRole(role) });
  } catch (error) {
    return safeError(res, error, 'UpdateRole');
  }
};

/**
 * Delete a role
 */
export const deleteRole = async (req, res) => {
  const { id } = req.params;
  try {
    const role = await Role.findByIdAndDelete(id);
    if (!role) {
      return res.status(404).json({ status: false, message: 'Role not found' });
    }
    return res.status(200).json({ status: true, message: 'Role deleted successfully' });
  } catch (error) {
    return safeError(res, error, 'DeleteRole');
  }
};
