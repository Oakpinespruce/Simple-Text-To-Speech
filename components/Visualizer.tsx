import React from 'react';

const Visualizer: React.FC = () => {
  return (
    <div className="flex items-end gap-[2px] h-4">
      <div className="w-1 bg-white rounded-full animate-[visualize_0.6s_ease-in-out_infinite]" style={{ height: '60%' }} />
      <div className="w-1 bg-white rounded-full animate-[visualize_0.8s_ease-in-out_infinite]" style={{ height: '100%' }} />
      <div className="w-1 bg-white rounded-full animate-[visualize_0.5s_ease-in-out_infinite]" style={{ height: '40%' }} />
      <div className="w-1 bg-white rounded-full animate-[visualize_0.7s_ease-in-out_infinite]" style={{ height: '80%' }} />
      <div className="w-1 bg-white rounded-full animate-[visualize_0.9s_ease-in-out_infinite]" style={{ height: '50%' }} />
      <style>{`
        @keyframes visualize {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.4); }
        }
      `}</style>
    </div>
  );
};

export default Visualizer;