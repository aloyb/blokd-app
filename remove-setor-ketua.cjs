#!/usr/bin/env node
/**
 * Hapus catatan "Setor ke Ketua" dari data.
 *
 * Alasan (keputusan user 2026-08-13): seluruh uang kas sekarang dipegang
 * bendahara sendiri, dan daftar pengeluaran resmi adalah data kompleks
 * Januari–Juli di `data.pengeluaran`. Jadi setoran ke Ketua bukan lagi
 * informasi yang perlu ditampilkan — sebelumnya cuma pindah tangan
 * (sudah ditandai type:'transfer' supaya tidak dihitung dobel).
 *
 * Sekalian hapus entry Blok D yang DUPLIKAT dengan daftar kompleks:
 * "Beli lampu sorot untuk lapangan" 506.000 (11 Jul) = "Lampu dan taso
 * lapangan" 506.000 (Juni) di daftar kompleks. Uang yang sama, dicatat 2x.
 *
 * Yang DIPERTAHANKAN: pengeluaran Blok D yang tidak ada di daftar kompleks
 * (Konsumsi gotong royong 100.000, Konsumsi wakar 203.000) — itu belanja
 * nyata yang tidak terwakili di rekap kompleks.
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data.json');
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));

const DUPLIKAT = [
  { date: '2026-07-11', amount: 506000 }, // = Lampu dan taso lapangan (Juni) di daftar kompleks
];

let hapusTransfer = 0;
let nilaiTransfer = 0;
let hapusDuplikat = 0;
let nilaiDuplikat = 0;
const disimpan = [];

Object.entries(data.blocks || {}).forEach(([key, block]) => {
  const asal = block.setorHistory || [];
  if (!asal.length) return;

  block.setorHistory = asal.filter(item => {
    if (item.type === 'transfer' || /setor ke ketua/i.test(item.keterangan || '')) {
      hapusTransfer += 1;
      nilaiTransfer += Number(item.amount || 0);
      return false;
    }
    if (DUPLIKAT.some(d => d.date === item.date && d.amount === Number(item.amount))) {
      hapusDuplikat += 1;
      nilaiDuplikat += Number(item.amount || 0);
      return false;
    }
    disimpan.push(`${key} ${item.date} Rp ${Number(item.amount).toLocaleString('id-ID')} - ${item.keterangan}`);
    return true;
  });
});

// Field warisan dari app lama, sudah tidak dipakai lagi.
delete data.setorKeKetua;

fs.writeFileSync(DATA, JSON.stringify(data, null, 2));

console.log(`Setor ke Ketua dihapus: ${hapusTransfer} entry (Rp ${nilaiTransfer.toLocaleString('id-ID')})`);
console.log(`Duplikat dihapus: ${hapusDuplikat} entry (Rp ${nilaiDuplikat.toLocaleString('id-ID')})`);
console.log(`Pengeluaran blok yang dipertahankan: ${disimpan.length}`);
disimpan.forEach(s => console.log('  ' + s));

const komplek = (data.pengeluaran || []).reduce((s, i) => s + Number(i.amount || 0), 0);
const blok = Object.values(data.blocks || {})
  .flatMap(b => b.setorHistory || [])
  .reduce((s, i) => s + Number(i.amount || 0), 0);
console.log(`\nPengeluaran kompleks (Jan-Jul): Rp ${komplek.toLocaleString('id-ID')}`);
console.log(`Pengeluaran blok (sisa)       : Rp ${blok.toLocaleString('id-ID')}`);
console.log(`TOTAL PENGELUARAN             : Rp ${(komplek + blok).toLocaleString('id-ID')}`);
