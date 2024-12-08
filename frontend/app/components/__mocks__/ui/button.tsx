import React from 'react';

export const Button = ({ children, onClick, ...props }: any) => (
  <button onClick={onClick} {...props}>{children}</button>
); 