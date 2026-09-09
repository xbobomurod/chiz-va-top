# Avatarlar, Votekick, Mute va Report

Skribbl uslubidagi sozlanadigan odamcha avatarlar hamda o'yin ichida ishlaydigan Votekick, Mute va Report imkoniyatlari qo'shiladi.

## 1. Avatar (odamcha)

Har bir o'yinchi o'zining odamchasini yasaydi — hech qanday rasm fayli kerak emas, hammasi kod bilan chiziladi, shuning uchun tez yuklanadi va istalgan o'lchamda tiniq ko'rinadi.

Sozlanadigan qismlar (har biri chapga/o'ngga strelka bilan almashtiriladi):
- Rang — 12 xil yuz rangi
- Ko'z — 12 xil
- Og'iz — 12 xil
- Bosh kiyim / aksessuar — 12 xil (shlyapa, ko'zoynak, toj, tasma va h.k., "yo'q" varianti ham bor)

Qayerda ko'rinadi:
- Bosh sahifada ism kiritish yonida katta avatar va sozlash tugmalari, "Tasodifiy" tugmasi bilan
- Xonaga qo'shilish oynasida ham xuddi shu sozlagich
- Lobbi va o'yinchilar ro'yxatida hozirgi harfli kvadrat o'rniga
- Mobil o'yinchilar tasmasida
- Chat xabarlari yonida
- Yakuniy natijalar sahifasida g'oliblar avatari bilan

Tanlov brauzerda saqlanadi, keyingi safar o'sha odamcha bilan kiriladi. O'yin davomida ham lobbida avatarni o'zgartirish mumkin.

## 2. Votekick (ovoz berib chiqarish)

- Har bir o'yinchi kartochkasida "Chiqarish" tugmasi (o'ziga nisbatan yo'q)
- Bosilganda ovoz beriladi va chatda tizim xabari chiqadi: "X — Y ni chiqarishga ovoz berdi (2/3)"
- Ulangan o'yinchilarning yarmidan ko'pi ovoz bersa — o'yinchi xonadan chiqariladi va o'sha xonaga qayta kira olmaydi
- Chiqarilgan odam chizayotgan bo'lsa, navbat darhol keyingi odamga o'tadi
- Ovozlar har navbatda yangilanadi, xona 3 kishidan kam bo'lsa votekick ishlamaydi

## 3. Mute (ovozini o'chirish)

- Har bir o'yinchi kartochkasida mikrofon/dinamik belgisi
- Faqat bosgan odamning ekranida ishlaydi: o'sha o'yinchining xabarlari chatda ko'rinmaydi
- Serverga tegmaydi, brauzerda saqlanadi — sahifa yangilansa ham qoladi
- To'g'ri javob topgani haqidagi tizim xabarlari baribir ko'rinadi

## 4. Report (shikoyat)

- O'yinchi kartochkasida shikoyat tugmasi, sabab tanlanadi (haqoratli ism, haqoratli rasm, spam, boshqa)
- Shikoyat bazaga yoziladi
- Bir xonada bitta o'yinchiga 3 xil odamdan shikoyat kelsa — u avtomatik chiqariladi
- Bir odam bir kishiga faqat bir marta shikoyat qila oladi

## Texnik qism

Baza (bitta migratsiya):
- `players` jadvaliga `avatar jsonb` (rang/ko'z/og'iz/aksessuar indekslari) va `kicked boolean` ustunlari
- Yangi `votekicks` jadvali: `room_id`, `target_id`, `voter_id`, `created_at`, unikal (room, target, voter)
- Yangi `reports` jadvali: `room_id`, `target_id`, `reporter_id`, `reason`, `created_at`, unikal (room, target, reporter)
- Ikkalasiga ham RLS + GRANT; o'qish ochiq emas (faqat server yozadi/o'qiydi), `votekicks` uchun sanoq server orqali chatga chiqadi
- Realtime `players` allaqachon yoqilgan, avatar shu orqali tarqaladi

Server funksiyalari (`src/lib/game.functions.ts` + `game.server.ts`):
- `createRoom` va `joinRoom` avatar qabul qiladi; `kicked=true` bo'lgan ism/token qayta kira olmaydi
- `updateAvatar` — lobbida avatarni o'zgartirish
- `voteKick` — ovozni yozadi, sanaydi, chegaradan o'tsa `kicked=true` + `connected=false` qiladi, chizayotgan bo'lsa navbatni `endTurn` orqali tugatadi
- `reportPlayer` — shikoyatni yozadi, 3 taga yetsa chiqaradi
- Barchasi token orqali tekshiriladi, mavjud `playerFromToken` naqshi bilan

Frontend:
- Yangi `src/components/game/Avatar.tsx` (SVG odamcha) va `AvatarPicker.tsx`
- `src/lib/avatar.ts` — qismlar ro'yxati, tasodifiy yasash, localStorage'da saqlash (`src/lib/identity.ts` yonida)
- `PlayerPanel`, `ChatPanel`, `Lobby`, `Leaderboard`, mobil tasma va `routes/index.tsx` avatarga o'tkaziladi
- Mute ro'yxati localStorage'da, chat filtrida qo'llanadi
- Dizayn hozirgi doska uslubi va ranglarida qoladi, matnlar o'zbekcha
