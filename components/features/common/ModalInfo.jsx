'use client';

import Modal from 'react-modal';

export default function ModalInfo({ isOpen, onClose }) {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={{
        content: {
          top: '50%',
          left: '50%',
          right: 'auto',
          bottom: 'auto',
          marginRight: '-50%',
          transform: 'translate(-50%, -50%)',
          width: '300px',
          padding: '20px',
          color: 'black',
          borderRadius: '12px',
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)', 
        },
      }}
      contentLabel="Mint Info Modal"
    >
      <h2 className="text-lg font-bold mb-4">Sumak Mint Info</h2>
      <p>Name: Default Sumak Avatar</p>
      <p>Style: Low-Poly</p>
      <p>Dimensions: 2m x 2m x 2m</p>
      <p>Polygon Count: ~1,000</p>
      <button 
        onClick={onClose} 
        className="w-full mt-4 px-4 py-2 bg-black text-white rounded-xl"
      >
        Ok
      </button>
    </Modal>
  );
}
