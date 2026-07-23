const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ],
      index: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required']
    }
  },
  {
    timestamps: true // Auto-generates createdAt and updatedAt
  }
);

// Pre-save hook to hash the password securely
userSchema.pre('save', async function () {
  const user = this;
  
  // Only hash the password if it has been modified or is new
  if (!user.isModified('passwordHash')) {
    return;
  }
  
  // Generate salt with 12 rounds (industry standard for security strength)
  const salt = await bcrypt.genSalt(12);
  user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
});

// Compare password method for validation during login
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    throw new Error(error);
  }
};

// Safeguard serialization - prevent passwordHash or metadata from being leaked
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  }
});

userSchema.set('toObject', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
