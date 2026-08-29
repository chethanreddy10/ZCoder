// middleware/auth.js
const { verifyToken } = require("../config/auth");

const auth = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Authorization token required' });
        }

        // Verify token
        const decoded = verifyToken(token);
        
        // Attach user to request
        req.user = decoded;
        // console.log(1, decoded);
        
        next();
    } catch (err) {
        console.error('Auth error:', err.message);
        res.status(401).json({ error: 'Please authenticate' });
    }
};

module.exports = auth;
