import React from 'react';
import { Box } from '@mui/material';

// Şirket bilgileri
export const COMPANY_INFO = {
  name: 'ARC CAR OTOMOTİV',
  fullName: 'ARC CAR OTOMOTİV SANAYİ LİMİTED ŞİRKETİ',
  address: 'Mustafa Kemal Mahallesi 98031 Sokak No: 2/A',
  district: 'Toroslar/MERSİN',
  phone: '0506 164 62 92',
  taxOffice: 'Liman V.D.',
  taxNo: '073 098 6337',
};

// Logo SVG Component
export const CompanyLogo = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    {/* Arka plan daire */}
    <circle cx="50" cy="50" r="48" fill="#1565C0" />
    {/* İç daire */}
    <circle cx="50" cy="50" r="42" fill="none" stroke="#fff" strokeWidth="2" />
    {/* Araba silüeti */}
    <path 
      d="M25 55 L30 45 L40 42 L60 42 L70 45 L75 55 L75 60 L25 60 Z" 
      fill="#fff"
    />
    {/* Tekerlekler */}
    <circle cx="35" cy="60" r="6" fill="#1565C0" stroke="#fff" strokeWidth="2" />
    <circle cx="65" cy="60" r="6" fill="#1565C0" stroke="#fff" strokeWidth="2" />
    {/* ARC yazısı */}
  </svg>
);

// Yazdırma başlığı componenti - Kompakt versiyon
const PrintHeader = () => {
  return (
   
    <Box sx={{ textAlign: 'center', mb: 2 }}></Box>
    );
};

export default PrintHeader;
