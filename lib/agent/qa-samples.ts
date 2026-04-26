// A pre-canned demo transcript used by the "Try sample" button on /agent/qa.
// Intentionally seeded with both violations (guaranteed-profit promise,
// missing cooling-off, pressure tactic) and strengths (empathy, clear rate
// disclosure) so the QA reviewer has plenty to find.

export const SAMPLE_TRANSCRIPT_UZ = `AGENT: Assalomu alaykum Aziz aka, men SQBdan Murod.
CUSTOMER: Va alaykum assalom.
AGENT: Sizning ipoteka kalkulyatorimizdan ikki marta foydalanganingizni ko'rdim. Yangi mahsulotimiz haqida gaplashsam bo'ladimi?
CUSTOMER: Mayli, lekin foiz stavkalari hozir juda yuqori-ku.
AGENT: Tushunaman, bu ko'p mijozlarni xavotirga solyapti. Lekin bizning yangi KAPITAL IPOTEKA mahsulotimiz 17 foizda — bozor o'rtachasidan past.
AGENT: Va shuni aytib qo'yay, bu kreditni olganingizdan keyin daromadingiz albatta oshadi, kafolatli foyda.
CUSTOMER: Hmm, qiziq. Qancha to'lov bo'ladi?
AGENT: Sizning daromadingizga ko'ra, oyiga qariyb bir million ikki yuz ming so'm.
CUSTOMER: Anchagina-ku.
AGENT: Lekin shu hafta oxirigacha imkoniyat bor, keyin shartlar o'zgaradi. Bugun qaror qilsangiz yaxshi bo'ladi.
CUSTOMER: Hujjatlar kerakmi?
AGENT: Pasport, daromad ma'lumotnomasi va ish joyidan ma'lumotnoma. Ma'lumotlaringizni qayta ishlashga rozimisiz?
CUSTOMER: Ha, roziman.
AGENT: Ajoyib, ertaga Yunusobod filialida soat o'n ikkida uchrashamiz.
CUSTOMER: Mayli, bo'pti. Xayr.
AGENT: Yaxshi kun. Xayr.`;

// Russian variant (shorter), for testing language detection.
export const SAMPLE_TRANSCRIPT_RU = `АГЕНТ: Здравствуйте, это Мурод из SQB.
КЛИЕНТ: Здравствуйте.
АГЕНТ: Я вижу, вы интересовались ипотекой. У нас есть отличное предложение — гарантированная выгода!
КЛИЕНТ: Какая ставка?
АГЕНТ: 17 процентов, но решайте сегодня — завтра условия изменятся.
КЛИЕНТ: Дорого. Подумаю.
АГЕНТ: Хорошо, перезвоню завтра. До свидания.`;
