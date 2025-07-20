// Server URI
export const host = process.env.REACT_APP_SERVER_URI;

// API Routes
export const registerRoute = `${host}/api/auth/register`;
export const loginRoute = `${host}/api/auth/login`;
export const setAvatarRoute = `${host}/api/auth/setavatar`;
export const allUsersRoute = `${host}/api/auth/allusers`;
export const sendMessageRoute = `${host}/api/messages/addmsg`;
export const getAllMessagesRoute = `${host}/api/messages/getmsg`;
export const searchMessagesRoute = `${host}/api/messages/search`;
export const updateProfileRoute = `${host}/api/auth/updateprofile`;
export const updatePasswordRoute = `${host}/api/auth/updatepassword`;

// Admin Routes
export const adminStatsRoute = `${host}/api/admin/stats`;
export const adminUsersRoute = `${host}/api/admin/users`;
export const adminBanUserRoute = `${host}/api/admin/ban`;
export const adminLogsRoute = `${host}/api/admin/logs`;
export const adminModerationRoute = `${host}/api/admin/moderation`;

// Export Routes
export const exportJsonRoute = `${host}/api/export/json`;
export const exportTxtRoute = `${host}/api/export/txt`;
export const exportAllRoute = `${host}/api/export/all`;

// Group Routes
export const createGroupRoute = `${host}/api/groups/create`;
export const getUserGroupsRoute = `${host}/api/groups/user`;
export const getGroupMessagesRoute = `${host}/api/groups`;
export const sendGroupMessageRoute = `${host}/api/groups/message`;
export const addGroupMembersRoute = `${host}/api/groups`;
export const leaveGroupRoute = `${host}/api/groups`;
