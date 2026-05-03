const UserModel = require('./mongoose/User');

// Validation: Check email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validation: Check required fields for registration
function validateRegistration(data) {
    const errors = [];
    if (!data.username || data.username.trim() === '') {
        errors.push('Username is required');
    }
    if (!data.email || data.email.trim() === '') {
        errors.push('Email is required');
    }
    if (!data.password || data.password.trim() === '') {
        errors.push('Password is required');
    }
    if (data.email && !isValidEmail(data.email)) {
        errors.push('Invalid email format');
    }
    return errors;
}

// Validation: Check login fields
function validateLogin(data) {
    const errors = [];
    if (!data.username || data.username.trim() === '') {
        errors.push('Username or email is required');
    }
    if (!data.password || data.password.trim() === '') {
        errors.push('Password is required');
    }
    return errors;
}

const User = {
    ensureDataExists() {},

    // Get all users
    async findAll() {
        const users = await UserModel.find({});
        return users.map(u => u.toSafeObject());
    },

    // Find user by ID
    async findById(id) {
        const user = await UserModel.findById(id);
        return user ? user.toSafeObject() : undefined;
    },

    // Find user by email
    async findByEmail(email) {
        const user = await UserModel.findOne({ email });
        return user ? user.toSafeObject() : undefined;
    },

    // Find user by username (or email for login)
    async findByUsername(username) {
        const user = await UserModel.findOne({
            $or: [{ username }, { email: username }]
        });
        return user ? user.toSafeObject() : undefined;
    },

    // Create new user
    async create(userData) {
        const errors = validateRegistration(userData);
        if (errors.length > 0) {
            return { success: false, errors };
        }

        try {
            // Check for existing user
            const existingUser = await UserModel.findOne({
                $or: [
                    { email: userData.email },
                    { username: userData.username }
                ]
            });

            if (existingUser) {
                return { success: false, errors: ['User already exists'] };
            }

            const newUser = await UserModel.create({
                username: userData.username.trim(),
                email: userData.email.trim(),
                address: userData.address || '',
                password: userData.password
            });

            return {
                success: true,
                user: newUser.toSafeObject()
            };
        } catch (error) {
            if (error.name === 'ValidationError') {
                const firstError = Object.values(error.errors)[0];
                return { success: false, errors: [firstError.message] };
            }
            if (error.code === 11000) {
                return { success: false, errors: ['User already exists'] };
            }
            throw error;
        }
    },

    // Update user
    async update(id, userData) {
        try {
            const user = await UserModel.findById(id);

            if (!user) {
                return { success: false, errors: ['User not found'] };
            }

            // Check if username/email already taken by another user
            if (userData.email || userData.username) {
                const whereConditions = [];
                if (userData.email) whereConditions.push({ email: userData.email });
                if (userData.username) whereConditions.push({ username: userData.username });

                if (whereConditions.length > 0) {
                    const existingUser = await UserModel.findOne({
                        _id: { $ne: id },
                        $or: whereConditions
                    });

                    if (existingUser) {
                        return { success: false, errors: ['Username or email already taken'] };
                    }
                }
            }

            // Update fields
            if (userData.username) user.username = userData.username;
            if (userData.email) user.email = userData.email;
            if (userData.phone !== undefined) user.phone = userData.phone;
            if (userData.address !== undefined) user.address = userData.address;

            await user.save();

            return {
                success: true,
                user: user.toSafeObject()
            };
        } catch (error) {
            if (error.name === 'ValidationError') {
                const firstError = Object.values(error.errors)[0];
                return { success: false, errors: [firstError.message] };
            }
            if (error.code === 11000) {
                return { success: false, errors: ['Username or email already taken'] };
            }
            throw error;
        }
    },

    // Validate credentials for login
    async validateCredentials(username, password) {
        const errors = validateLogin({ username, password });
        if (errors.length > 0) {
            return { success: false, errors };
        }

        const user = await UserModel.findOne({
            $or: [{ username }, { email: username }]
        });

        if (user && await user.validatePassword(password)) {
            return {
                success: true,
                user: user.toSafeObject()
            };
        }

        return { success: false, errors: ['Invalid credentials'] };
    }
};

module.exports = User;
