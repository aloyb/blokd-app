#!/usr/bin/env node
/**
 * Tandai entry "Setor ke Ketua" di Blok D sebagai TRANSFER, bukan pengeluaran.
 *
 * Alasan: uang yang disetor perwakilan Blok D ke Ketua tidak hilang dari
 * kompleks — uang itu pindah tangan, lalu dibelanjakan dan tercatat lagi di
 * `data.pengeluaran` (daftar pengeluaran kompleks). Kalau keduanya dihitung
 * sebagai pengeluaran, nilainya dobel.
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data.json');
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));

let ditandai = 0;
let nilaiTransfer = 0;

Object.values(data.blocks || {}).forEach(block => {
  (block.setorHistory || []).forEach(item => {
    if ((item.keterangan || '').toLowerCase().includes('setor ke ketua')) {
      item.type = 'transfer';
      ditandai += 1;
      nilaiTransfer += Number(item.amount || 0);
    }
  });
});

fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
console.log(`Ditandai transfer: ${ditandai} entry, total Rp ${nilaiTransfer.toLocaleString('id-ID')}`);
