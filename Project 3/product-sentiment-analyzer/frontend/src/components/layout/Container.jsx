import React from 'react';

export default function Container({ children, style = {} }) {
  return (
    <div className="main-container" style={{
      width: '100%',
      ...style
    }}>
      {children}
    </div>
  );
}
