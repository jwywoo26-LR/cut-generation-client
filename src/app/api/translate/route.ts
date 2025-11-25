import { NextResponse } from 'next/server';

interface TranslationRequest {
  koreanText: string;
  persona?: string;
  targetStyle: 'formal' | 'friendly' | 'casual' | 'narrative';
}

// Enhanced system instruction emphasizing localization over literal translation
const SYSTEM_INSTRUCTION = [
  'You are an elite localization specialist and creative writer, specializing in adapting Korean webtoons for a native Japanese audience.',
  'Your core task: Meticulously translate the source **Korean (KR) text** into **flawless, idiomatic Japanese (JPN)**.',
  'This is **localization, not literal translation**. You must capture the original\'s *intent, subtext, emotion, and character voice* (factoring in personality, age, gender, and tone).',
  'The final output must be so natural that it feels originally written in Japanese. Ensure all dialogue is compelling and perfectly fits the manga/webtoon context.',
  'You must follow the KOREAN new line patterns when translating it to Japanese',
  '【例文(スタイルのヒント)】', 'この子が幸愛ちゃん？', '出会い系アプリ內の写真より', 'すっごくかわいい！', '完全に俺の好み···', '', 'え―', '完全におじさんじゃん', '写真と全然違う', '', 'マスクの中も', 'すごく可愛いそう···', "いつのまにか結婚3年目、\n他人から見れば私たちは\n幸せな新婚夫婦だ", "夫はよそ見をせず\n真面目なタイプだ", "その点が好きで\n結婚を決心した", "召し上がれ", "美味しいそうだな", "毎日朝食を作ってくれて、\n夫がおいしそうに\n食べるのを見るのが私の幸せ", "ただ一つ\n残念なことが\nあるとしたら···", "あなた\n寝てる？", "う~ん、\n眠い···", "ねぇ、\n抱きしめて", "ううん、\n明日抱きしめてあげる\n今日は疲れた···", "はぁ··· \n今日も\nだめなのかな", "最後にしたのが\nいつだったか···", "うん、博士君?\nコ―ヒ―でも飲みに\n来ないかなと思って···", "今すぐ来られるって？\nよかった、あ、いや、\nじゃあ、後でね！", "おはよう\n早く来たね", "この前に隣に引っ越してきた\n博士君は会うことが多く、\nすぐ親しくなった", "博士君は彼女とか\nまだいないの？\nこんなにいい男なのに", "いや、まあ···\nそうですね", "おばさんが\nこんなの聞くのも\nおかしいかな？", "え？", "何を考えてるの？", "あ、今日の 月稀乃さん\nちょっとエロいなぁって···", "エロいってどんな風に？\nねぇ、おしえて？", "つ、月稀乃さん？", "···うぅん", "···ん", "最初からこうする\nつもりではなかった\nでも···", "目の前の博士君が\nあんまりにも眩しくて\n魅力的だったから···", "はうん", "···ん", "博士君···\n部屋に行こうか？", "はうん", "はっ、\nんむっ", "月稀乃さん、\n弾力がすごいですね", "···ん、博士君\nもっと···", "ふあぁっ", "んっ、博士君の手\n暖かくて嫌らしくて\n気持ちいい···あん", "いきなりそんなに\n強くしたら···\nフアァッ！", "月稀乃さん、\n感じてますね\nすっごくエロいよ", "そんなことないっ···\nんはっ！", "おっぱいも\n素晴らしいじゃ\nないですか", "乳首の感触も\nいいし", "あっ、乳頭は\n敏感すぎるから···ッ", "月稀乃さんのおっぱいが\n大きくて柔らかくて\n我慢できないですよ", "ハウゥ~~!!", "月稀乃さんの夫は\n毎日こんなおっぱいを\n満喫しているでしょう？", "うっ！\nそんなこと\n言わないでッ", "フゥンッ", "博士君の···硬くて大きい\nやっぱり若いからかな？", "ハム", "うん···", "っん！", "くぅッ、\n月稀乃さん\n上手すぎっ···！", "これ以上やったら\n出ちゃいそうですッ!", "うん···", "っん！", "ごし\nごし", "ぬり\nぬり", "うわあぁッ！\n出る、出るうッ!!", "んっ···", "パァー", "ふふっ", "ごくん♡", "すごく出た♡", "まだ\n足りないそうね、\n博士君", "はぁはぁ、\n月稀乃さんがすっごく\n魅力的ですから", "ふふっ、かわいいね\nじゃあ続けようか？", "うッ、さっきより\nもっと大きくなってない？\n入れにくいッ！", "つ、月稀乃さん···！", "は、入った♡", "じゃ、\n動くよ", "月稀乃さんの夫だけ\n独り占めしておいて\n放置するなんて!!", "ちょ、ちょっと\n博士君？\n激しすぎッ!", "月稀乃さんのこの腰の動きを\nほったらかしておくなんて\nもったいない!! ", "あっ、うっ、\nそんなこと言ったら、\nあたしッ···！", "おっぱいが\nすっごく揺れて、\nすっごくエッチで\n我慢できねえ！", "アァァッ、\n早すぎッ！", "私、私、\n行っちゃうッ！", "お、俺も\n行きそうッ！\n奥に出しますッ！", "ま、待って！\n中は···\nフアァァァン!!", "中は危ないと\n言ったのに", "夫に嫉妬したの？\nかわいい", "今日は\n博士君専用だから\n思いっきり\nやってもいいよ", "博士君、\n後ろでするのも\n好き？", "ア、ア、\n私もいい\nもっともっと\n続けて", "じゃあ \n行きます", "フアァン!", "はぁ、もっと\nもっとッ", "もっと\nやってェッ", "月稀乃さんの夫のより\n俺のものがいいでしょう？", "あっ、大好き！\n大好きィッ!!", "いいですしょう\n夫の痕跡は消して\nすべて俺のもので\n満たしてあげましょう", "あぁ、気持ちいい\nもう止められない!!", "っ、\n月稀乃さん―！", "うん？\n出ちゃいそう？", "また、\nいきそうですっ", "いいよ、出して!!\nまた中に\nいっぱい入れて!!", "アァン、\n私も···私もッ", "行く···\n行く···ッ!!", "フアァ―ッ!!\n熱い!!", "博士君の熱い精液が\nまた私の中に\nいっぱい\n詰まってるッ！", "溢れ出してるゥ―ッ!!", "スッポン", "はぁはぁ···\nもう頭の中が\nすごく白くって", "博士君のことしか\n思い浮かばないよ···♡", "どろぉ", "ふふっ、博士君\nまた明日ね"
].join('\n');

// Build detailed style guides based on translation type
function buildStyleGuide(style: string): string {
  const s = style.toLowerCase();
  switch (s) {
    case 'formal': // manga-polite equivalent
      return '文体: 丁寧体(です/ます調)ベース。ウェブトゥーン/漫画の台詞に適した自然な口調。\n語尾「〜ですね／〜ですよ／〜かな」などは自然な範囲で少量使用可。\n過度な伸ばし表現「〜ですね〜」は禁止。必要な強調時のみ控えめに。\n台詞らしい自然なリズムを保ち、読者が違和感なく没入できる訳文を作成。';

    case 'friendly': // friendly-polite equivalent
      return '文体: 親しみのある丁寧体(です/ます)。\n語尾に「〜ですね／〜ですよ／〜かな」などを自然な範囲で少量使用。\n伸ばし表現「〜ですね〜」は強調時のみ控えめに。乱用しない。';

    case 'casual':
      return '文体: カジュアル。自然で軽すぎない口語。\n語尾の多用は避け、テンポよく。';

    case 'narrative': // narration-da equivalent
      return '文体: 地の文・説明文。「〜だ／〜である」調で簡潔に記述。\n終助詞(ね・よ・かな 等)や台詞口調は禁止。客観的・要点重視。\n体言止めは可。ただし乱用せず読みやすさ優先。';

    default:
      return buildStyleGuide('formal');
  }
}

// Retry logic with exponential backoff
async function callGeminiWithRetry(
  url: string,
  body: object,
  maxRetries = 3
): Promise<{
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        return await response.json();
      }

      const errorText = await response.text();
      console.error(`Gemini API error (attempt ${attempt}/${maxRetries}):`, errorText);

      if (attempt === maxRetries) {
        throw new Error(`Translation API failed after ${maxRetries} attempts: ${response.status}`);
      }

      // Exponential backoff: wait 1s, 2s, 4s...
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }

  throw new Error('Translation failed after all retries');
}

export async function POST(request: Request) {
  try {
    const { koreanText, persona, targetStyle } = await request.json() as TranslationRequest;

    if (!koreanText) {
      return NextResponse.json(
        { error: 'Korean text is required' },
        { status: 400 }
      );
    }

    // Get API configuration from environment
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Translation API not configured' },
        { status: 500 }
      );
    }

    // Build style guide and persona context
    const styleGuide = buildStyleGuide(targetStyle);
    const personaContext = persona ? `\n\nキャラクター設定:\n${persona}` : '';

    // Construct the full prompt
    const userPrompt = `${SYSTEM_INSTRUCTION}\n\n${styleGuide}${personaContext}\n\n翻訳する韓国語テキスト:\n${koreanText}\n\n翻訳結果のみを返してください。説明や追加のコメントは不要です。`;

    // Call Gemini API with retry logic using gemini-2.5-flash
    const data = await callGeminiWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        contents: [{
          parts: [{
            text: userPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.2, // Lower temperature for more consistent translations
          maxOutputTokens: 1000,
        }
      }
    );

    // Extract the translated text
    const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!translatedText) {
      throw new Error('No translation returned from API');
    }

    return NextResponse.json({
      success: true,
      translatedText: translatedText.trim()
    });

  } catch (error) {
    console.error('Translation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Translation failed';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
