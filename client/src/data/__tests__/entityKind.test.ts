import { describe, it, expect } from 'vitest'
import { classifyEntity, entityGlyph, ENTITY_GLYPH, ENTITY_ICON_SRC, type EntityKind } from '../entityKind'
import { CATEGORY_GLYPH } from '../symbology'

describe('classifyEntity', () => {
  it('recognises people from their occupation', () => {
    const people = [
      'American politician',
      'President of the United States',
      'Israeli prime minister',
      'British journalist and broadcaster',
      'Iranian cleric and politician',
      'Brazilian footballer',
      'French economist',
      'Egyptian film director',
    ]
    for (const d of people) expect(classifyEntity(d), d).toBe('person')
  })

  it('recognises organisations', () => {
    const orgs = [
      'intergovernmental military alliance',
      'political party in Germany',
      'United Nations specialised agency',
      'multinational technology company',
      'Palestinian militant group',
      'central bank of the eurozone',
      'international humanitarian organisation',
      'American news network',
    ]
    for (const d of orgs) expect(classifyEntity(d), d).toBe('org')
  })

  it('recognises places', () => {
    const places = [
      'country in East Asia',
      'capital of France',
      'landlocked country in Central Asia',
      'island in the Mediterranean',
      'city in northern Israel',
      'strait connecting the Persian Gulf',
      'autonomous territory',
    ]
    for (const d of places) expect(classifyEntity(d), d).toBe('place')
  })

  it('recognises events and documents', () => {
    const works = [
      'peace treaty between Egypt and Israel',
      'armed conflict in Sudan',
      '2026 presidential election',
      'nuclear non-proliferation agreement',
      'magnitude 7.1 earthquake in Japan',
      'ongoing pandemic',
      'NASA space telescope',
    ]
    for (const d of works) expect(classifyEntity(d), d).toBe('work')
  })

  it('falls back to unknown rather than guessing', () => {
    expect(classifyEntity(undefined)).toBe('unknown')
    expect(classifyEntity(null)).toBe('unknown')
    expect(classifyEntity('')).toBe('unknown')
    expect(classifyEntity('a thing that defies description')).toBe('unknown')
  })

  it('does not fire on words that merely contain a keyword', () => {
    // The reason matching is boundary-anchored rather than a substring test.
    expect(classifyEntity('presidential election in Peru')).toBe('work')
    expect(classifyEntity('constitutional monarchy in Europe')).not.toBe('person')
    expect(classifyEntity('kingdom in Northern Europe')).not.toBe('person')
  })

  it('prefers the person reading when an occupation is present', () => {
    // A politician who ran an institution is still a person.
    expect(classifyEntity('American politician who served in the Senate')).toBe('person')
    expect(classifyEntity('Israeli general and minister of defence')).toBe('person')
  })

  it('is case-insensitive', () => {
    expect(classifyEntity('AMERICAN POLITICIAN')).toBe('person')
    expect(classifyEntity('Country In East Asia')).toBe('place')
  })

  it('is not confused by punctuation around the keyword', () => {
    expect(classifyEntity('journalist, author and activist')).toBe('person')
    expect(classifyEntity('city (municipality) in Spain')).toBe('place')
  })
})

/**
 * A Chinese interface resolves the summary against zh.wikipedia first, so these
 * are the descriptions the classifier actually sees there. Every one of them
 * returned `unknown` while the vocabulary was English-only — the panel showed
 * the same fallback glyph for a president, a country and a war.
 */
describe('classifyEntity, Chinese descriptions', () => {
  it('classifies each kind from its head word', () => {
    const cases: Array<[string, string]> = [
      ['美國政治人物', 'person'],
      ['中華民國第14任總統', 'person'],
      ['日本的物理學家', 'person'],
      ['巴西足球運動員', 'person'],
      ['政府間軍事同盟', 'org'],
      ['德國的政黨', 'org'],
      ['美國跨國科技公司', 'org'],
      ['聯合國專門機構', 'org'],
      ['東亞的國家', 'place'],
      ['圣城', 'place'],
      ['法國的首都', 'place'],
      ['中華人民共和國的一個省', 'place'],
      ['地中海的島嶼', 'place'],
      ['埃及與以色列之間的和平條約', 'work'],
      ['蘇丹的武裝衝突', 'work'],
      ['日本的一次地震', 'work'],
      ['正在進行的大流行', 'work'],
    ]
    for (const [d, kind] of cases) expect(classifyEntity(d), d).toBe(kind)
  })

  it('reads both script variants', () => {
    // zh-TW asks and Simplified comes back often enough that covering one
    // script would leave half of these unclassified.
    expect(classifyEntity('美国政治人物')).toBe('person')
    expect(classifyEntity('德国的政党')).toBe('org')
    expect(classifyEntity('东亚的国家')).toBe('place')
    expect(classifyEntity('苏丹的武装冲突')).toBe('work')
  })

  it('takes the head word over one buried in a modifier', () => {
    // The Chinese counterpart of "presidential election": a substring test
    // reads 總統 and calls an election a person. Word order settles it.
    expect(classifyEntity('秘魯總統選舉')).toBe('work')
    expect(classifyEntity('美國總統選舉')).toBe('work')
    // Likewise a country whose description mentions its head of government.
    expect(classifyEntity('由總統領導的共和國')).toBe('place')
    // And an occupation that ends in a place word only by coincidence.
    expect(classifyEntity('社會主義國家')).toBe('place')
  })

  it('falls back to the body when the head is not in the vocabulary', () => {
    expect(classifyEntity('日本的一位知名演員，活躍於1980年代')).toBe('person')
    expect(classifyEntity('總部設於瑞士的公司，成立於1898年')).toBe('org')
  })

  it('does not read a single character out of the middle of a word', () => {
    // 市 / 省 / 島 are reliable heads and useless substrings, so the body pass
    // skips them. Admitting them would make 市場 a place and 黨員 a party.
    expect(classifyEntity('負責市場監管，成立於1998年')).toBe('unknown')
    // Still a place when 市 is where the head belongs.
    expect(classifyEntity('日本本州的一個市')).toBe('place')
  })

  it('looks past a term of office or a romanisation in brackets', () => {
    // Both of these are verbatim from zh.wikipedia, and both park the head word
    // one bracket short of the end.
    expect(classifyEntity('中国共产党中央委员会总书记（2012年至今）')).toBe('person')
    expect(classifyEntity('2005年至2021年德國聯邦總理・德國首位女性總理（Angela Merkel）')).toBe('person')
  })

  it('still returns unknown when nothing matches', () => {
    expect(classifyEntity('一種難以歸類的東西')).toBe('unknown')
  })
})

/**
 * The description is an optional field and zh.wikipedia does not always return
 * one. A Chinese title is head-final in the same way a description is, so it
 * carries the answer for most of what a missing description would have said.
 */
describe('classifyEntity, falling back to the title', () => {
  it('reads the head of a Chinese title when there is no description', () => {
    const cases: Array<[string, string]> = [
      ['俄烏戰爭', 'work'],
      ['第二次世界大戰', 'work'],
      ['巴黎協定', 'work'],
      ['2024年美國總統選舉', 'work'],
      ['2019冠狀病毒病疫情', 'work'],
      ['荷姆茲海峽', 'place'],
    ]
    for (const [title, kind] of cases) expect(classifyEntity(null, title), title).toBe(kind)
  })

  it('leaves a title alone when the description already answered', () => {
    // 選舉 in the title must not overturn a description that says otherwise.
    expect(classifyEntity('美國政治人物', '2024年美國總統選舉')).toBe('person')
  })

  it('does not guess from an English title', () => {
    // Head-final is a property of Chinese, not of titles. Run through the
    // English word lists, "General Motors" is a general and "Bath" is a place.
    expect(classifyEntity(null, 'General Motors')).toBe('unknown')
    expect(classifyEntity(null, 'Joe Biden')).toBe('unknown')
  })

  it('gives up rather than inventing a kind the title cannot support', () => {
    expect(classifyEntity(null, '臺灣')).toBe('unknown')
    expect(classifyEntity(null, '耶路撒冷')).toBe('unknown')
    expect(classifyEntity(null, null)).toBe('unknown')
  })
})

describe('entity glyphs', () => {
  it('gives every kind a distinct glyph', () => {
    const glyphs = Object.values(ENTITY_GLYPH)
    expect(new Set(glyphs).size).toBe(glyphs.length)
  })

  it('resolves a description straight to its glyph', () => {
    expect(entityGlyph('American politician')).toBe(ENTITY_GLYPH.person)
    expect(entityGlyph('country in East Asia')).toBe(ENTITY_GLYPH.place)
    expect(entityGlyph(undefined)).toBe(ENTITY_GLYPH.unknown)
  })

  it('has artwork for every kind, including unknown', () => {
    // `unknown` is the one the chips show most, since it is what a name that
    // has not been looked up yet resolves to.
    for (const kind of Object.keys(ENTITY_GLYPH) as EntityKind[]) {
      expect(ENTITY_ICON_SRC[kind], kind).toMatch(/^\/icons\/entity\/\w+\.png$/)
    }
  })

  it('gives each kind its own file rather than sharing one', () => {
    const files = Object.values(ENTITY_ICON_SRC)
    expect(new Set(files).size).toBe(files.length)
  })

  it('does not reuse an event-category glyph for a filled shape', () => {
    // Entity kinds and event categories are separate channels. They never
    // appear side by side, but a same-shape-same-fill collision would still be
    // needless confusion — ⬢ (org) deliberately differs from ⬡ (CRIME).
    expect(Object.values(ENTITY_GLYPH)).not.toContain(CATEGORY_GLYPH.CRIME_SECURITY)
  })
})
