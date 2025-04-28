const LightColors = {
  primary: '#2c3e50',
  background: '#ffffff',
  lightGray: '#ecf0f1',
  danger: '#e74c3c',
  successGreen: '#2ecc71',
  lightBackground: '#f9f9f9',
  boxNeutral: '#bdc3c7',
  buttonYellow: '#f1c40f',
  warning: '#e67e22',
  linkBlue: '#2980b9',
};

const DarkColors = {
  primary: '#ffffff',
  background: '#121212',
  lightGray: '#1F1F1F',
  danger: '#e74c3c',
  successGreen: '#2ecc71',
  lightBackground: '#1F1F1F',
  boxNeutral: '#424242',
  buttonYellow: '#f1c40f',
  warning: '#e67e22',
  linkBlue: '#3498db',
};

export const getColors = (darkMode: boolean) => (darkMode ? DarkColors : LightColors);
