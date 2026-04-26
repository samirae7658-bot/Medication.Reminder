import { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Button, TextField, Container, Card, CardContent, Typography, Box } from '@mui/material';

const AuthForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      handleAuthError(err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      handleAuthError(err);
    }
  };

  const handleAuthError = (err) => {
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
    } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
    } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
    } else {
        setError(err.message);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 10 }}>
      <Card sx={{ borderRadius: 4, boxShadow: 6, p: 2 }}>
        <CardContent>
          <Typography variant="h4" align="center" color="primary.main" gutterBottom sx={{ fontWeight: 'bold' }}>
            Welcome to PillAlert
          </Typography>
          {error && (
            <Typography color="error" align="center" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Button 
                onClick={handleLogin} 
                type="submit" 
                variant="contained" 
                color="primary" 
                size="large" 
                fullWidth
              >
                Login
              </Button>
              <Button 
                onClick={handleRegister} 
                type="button" 
                variant="outlined" 
                color="primary" 
                size="large" 
                fullWidth
              >
                Register
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default AuthForm;
