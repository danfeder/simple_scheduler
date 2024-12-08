import React from 'react';

export const Card = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const CardContent = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const CardHeader = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const CardTitle = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
); 