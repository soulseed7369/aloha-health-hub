import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown, ChevronUp,
  Hand, Sparkles, Brain, Leaf, Activity, Sun, Apple, Moon, Heart,
} from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { JsonLd } from "@/components/JsonLd";
import { GuideCTA } from "@/components/GuideCTA";
import { getGuideBySlug } from "@/lib/guides";

const guide = getGuideBySlug("wellness-modalities-hawaii")!;
const CANONICAL = `https://hawaiiwellness.net/guides/${guide.slug}`;

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

interface Modality {
  name: string;
  anchor: string;
  description: string;
}

interface Category {
  id: string;
  title: string;
  intro: string;
  modalities: Modality[];
}

const CATEGORIES: Category[] = [
  {
    id: "bodywork",
    title: "Bodywork & Manual Therapy",
    intro:
      "Bodywork encompasses hands-on techniques that manipulate the soft tissues and structure of the body to relieve pain, improve circulation, and restore mobility. Hawaii's warm, healing culture makes it a natural home for these practices.",
    modalities: [
      {
        name: "Massage Therapy",
        anchor: "massage",
        description:
          "Massage therapy is the foundation of hands-on healing — the oldest, most universal form of therapeutic care practiced by virtually every culture on earth. At its core, it is the application of intentional, skilled touch to the body's soft tissues: muscles, tendons, fascia, and connective tissue. Through pressure, friction, and sustained contact, massage relieves chronic pain, reduces stress hormones, improves circulation, supports lymphatic drainage, and restores ease of movement. Research consistently demonstrates benefits for anxiety, sleep quality, immune function, and athletic recovery. In Hawaiʻi, where the spirit of aloha imbues every act of service with care and intention, therapeutic touch carries particular depth — and practitioners trained across multiple traditions are common. Within this broad tradition, dozens of distinct techniques have evolved to address specific needs. **Swedish massage** uses long gliding strokes to improve circulation and induce relaxation — the classic introductory massage. **Deep tissue massage** targets the deeper layers of muscle and connective tissue, applying sustained pressure to release chronic tension and knots. **Myofascial Release** works with the fascia — the connective tissue web surrounding every muscle and organ — using gentle sustained pressure to eliminate pain and restore motion. **Rolfing (Structural Integration)** is a more intensive form of fascia work developed by Ida Rolf, involving a systematic series of sessions that reorganize the body's alignment relative to gravity. **Manual Lymphatic Drainage (MLD)** uses feather-light circular strokes to stimulate the lymphatic system, reducing swelling, supporting immunity, and detoxifying tissues — especially valued post-surgery or for lymphedema. **Sports massage** combines techniques tailored to the physical demands of athletes, focusing on injury prevention, recovery, and performance. **Thai massage** is performed on a mat on the floor, with the practitioner using their hands, elbows, knees, and feet to move the recipient through assisted yoga-like stretches while applying acupressure along energy lines (sen). **Prenatal massage** adapts positioning and pressure for pregnant clients, addressing the unique discomforts of pregnancy such as lower back pain, hip tension, and swollen ankles. **Shiatsu** is a Japanese form of finger-pressure therapy applied along the body's meridian lines, similar in philosophy to acupuncture but without needles. **Reflexology** maps the hands, feet, and ears as microcosms of the entire body — applying targeted pressure to reflex points to support corresponding organs and systems.",
      },
      {
        name: "Chiropractic",
        anchor: "chiropractic",
        description:
          "Chiropractic care focuses on the diagnosis and treatment of musculoskeletal disorders, with particular emphasis on the spine. Practitioners use manual spinal manipulation (adjustments) to restore proper alignment, relieve nerve pressure, and improve overall nervous system function. Many Hawaii chiropractors integrate soft-tissue work, nutrition counseling, and lifestyle coaching into their practice. **Network Spinal Analysis (Network Chiropractic)** is a gentler, more energetic form that uses light touches at specific spinal gateways to help the nervous system release stored tension patterns.",
      },
      {
        name: "Craniosacral Therapy",
        anchor: "craniosacral",
        description:
          "Craniosacral Therapy (CST) is an extraordinarily gentle form of bodywork that works with the rhythmic movement of cerebrospinal fluid around the brain and spinal cord. Practitioners use a touch lighter than the weight of a nickel to release restrictions in the craniosacral system, relieving tension deep in the body and improving central nervous system function. CST is particularly effective for headaches, migraines, chronic neck and back pain, TMJ disorders, post-traumatic stress, and sensory processing challenges in children.",
      },
      {
        name: "Physical Therapy",
        anchor: "physical-therapy",
        description:
          "Physical therapists in Hawaii are licensed healthcare providers who diagnose and treat movement disorders resulting from injury, surgery, or chronic conditions. Beyond rehabilitation exercises, many PTs incorporate manual therapy, dry needling, ultrasound, and functional movement assessments. Hawaii's active outdoor lifestyle — surfing, hiking, paddling — means local PTs often specialize in sports rehab and performance optimization.",
      },
      {
        name: "Osteopathic Medicine",
        anchor: "osteopathic",
        description:
          "Osteopathic physicians (DOs) are fully licensed medical doctors who additionally train in Osteopathic Manipulative Treatment (OMT) — hands-on techniques to diagnose, treat, and prevent illness. OMT addresses the body as an integrated unit, recognizing that structure and function are interrelated. Techniques include muscle energy, counterstrain, high-velocity low-amplitude thrust, and myofascial release.",
      },
      {
        name: "Watsu / Water Therapy",
        anchor: "watsu",
        description:
          "Watsu (Water Shiatsu) combines elements of Zen Shiatsu with the weightlessness of warm water. The recipient floats in a heated pool while the practitioner gently cradles, stretches, and massages them, moving through flowing sequences that are impossible to replicate on land. The combination of buoyancy, warmth, and skilled touch creates profound physical release and emotional unwinding. Hawaii's natural relationship with water makes Watsu particularly resonant here.",
      },
    ],
  },
  {
    id: "energy",
    title: "Energy & Vibrational Healing",
    intro:
      "Energy healing traditions work with the subtle energy fields and bioelectric systems of the body. While many of these practices predate modern science, contemporary research in biofield science continues to investigate their mechanisms. Hawaii's volcanic land and ocean energy create a uniquely powerful setting for these practices.",
    modalities: [
      {
        name: "Reiki",
        anchor: "reiki",
        description:
          "Reiki is a Japanese energy healing technique developed by Mikao Usui in the early 20th century. The word translates roughly as 'universal life energy.' Practitioners channel healing energy through their hands, lightly placed on or just above the body, to support the body's natural healing processes. Reiki promotes deep relaxation, reduces stress and anxiety, and supports physical and emotional healing. Hawaii has a vibrant Reiki community with practitioners trained across all lineages — Usui, Tibetan, Karuna, Holy Fire, and more.",
      },
      {
        name: "Sound Healing",
        anchor: "sound-healing",
        description:
          "Sound healing uses the therapeutic properties of vibration and frequency to shift the body and mind into coherent, healing states. Tibetan singing bowls, crystal bowls, gongs, tuning forks, drums, and the human voice are common instruments. Sound baths — where participants lie in restorative poses while immersed in overlapping tonal frequencies — are especially popular in Hawaii. Research suggests sound healing reduces cortisol, slows brainwave activity into meditative states, and may support cellular healing through resonance.",
      },
      {
        name: "Energy Healing",
        anchor: "energy-healing",
        description:
          "Encompassing a broad range of modalities — Healing Touch, Therapeutic Touch, Pranic Healing, Quantum Healing, and more — energy healing works with the body's biofield (the electromagnetic and subtle energy field surrounding the physical body). Practitioners assess and clear disturbances in the field to support physical, emotional, and spiritual wellbeing. Many Hawaii practitioners blend energy healing with other intuitive and somatic approaches.",
      },
      {
        name: "Family Constellation",
        anchor: "family-constellation",
        description:
          "Developed by German psychotherapist Bert Hellinger, Family Constellations is a therapeutic approach that reveals and heals hidden dynamics passed down through family systems across generations. In group or individual sessions, representatives (or objects) are placed spatially to represent family members, and the unconscious entanglements and loyalties that may be causing suffering in the present are revealed and resolved. This work is increasingly recognized as an effective approach for trauma, relationship patterns, physical illness, and recurring life difficulties.",
      },
    ],
  },
  {
    id: "mind-nervous-system",
    title: "Mind, Nervous System & Psychotherapy",
    intro:
      "The connection between mind and body is at the heart of modern integrative health. Hawaii's mental health and psychotherapy community has grown significantly, with many practitioners offering trauma-informed, somatic, and culturally sensitive care.",
    modalities: [
      {
        name: "Psychotherapy & Counseling",
        anchor: "psychotherapy",
        description:
          "Psychotherapy and counseling offer something no other wellness modality can fully replicate: a dedicated, confidential relationship in which to examine your inner life with skilled, compassionate guidance. The research is extensive — therapy reliably reduces symptoms of depression, anxiety, PTSD, and many other conditions, often with effects that outlast medication alone. Modern psychotherapy has evolved far beyond its origins: today's practitioners draw on neuroscience, attachment theory, somatic awareness, and decades of clinical research to offer precisely targeted approaches for specific conditions. Hawaiʻi's mental health community includes therapists trained across every major evidence-based school, many bringing cultural sensitivity shaped by the islands' diverse heritage. **Cognitive Behavioral Therapy (CBT)** addresses the relationship between thoughts, feelings, and behaviors — one of the most extensively researched therapeutic modalities for anxiety, depression, OCD, and PTSD. **EMDR (Eye Movement Desensitization and Reprocessing)** uses bilateral stimulation (often eye movements) to process traumatic memories, dramatically reducing their emotional charge. Originally developed for PTSD, EMDR is now used for phobias, grief, performance anxiety, and more. **IFS (Internal Family Systems)** views the psyche as a community of 'parts' — each with protective roles — and works to unburden wounded parts through compassionate internal dialogue. **ACT (Acceptance and Commitment Therapy)** uses mindfulness and values-based action to develop psychological flexibility rather than eliminating difficult thoughts and feelings. **DBT (Dialectical Behavior Therapy)** combines CBT with mindfulness and was originally developed for borderline personality disorder; it's now widely used for emotional dysregulation, self-harm, and eating disorders. **Psychodynamic therapy** explores how unconscious processes and early relational experiences shape present patterns. **Gestalt therapy** emphasizes present-moment awareness and the therapeutic relationship itself as the field of healing. **AEDP (Accelerated Experiential Dynamic Psychotherapy)** focuses on transforming trauma through moment-to-moment tracking of emotional experience and healing states. **Narrative therapy** helps clients re-author their life stories, separating person from problem. **Couples and relationship therapy** supports partners in developing communication, repairing ruptures, and rebuilding intimacy. **Group therapy** harnesses the healing power of shared experience, offering both community and mirrored insight.",
      },
      {
        name: "Somatic Therapy",
        anchor: "somatic-therapy",
        description:
          "Somatic therapies recognize that trauma, stress, and emotion are stored in the body — not just the mind. Somatic Experiencing (developed by Peter Levine) tracks bodily sensations to discharge incomplete trauma responses stored in the nervous system. Sensorimotor Psychotherapy integrates body-centered techniques with attachment theory. Somatic therapy is particularly powerful for complex trauma, chronic pain, dissociation, and conditions where talk therapy alone hasn't reached the root.",
      },
      {
        name: "Nervous System Regulation",
        anchor: "nervous-system",
        description:
          "Nervous system regulation focuses on restoring the body's ability to move fluidly between states of activation and rest — healing the dysregulation caused by chronic stress and trauma. Practitioners draw on polyvagal theory, breathwork, somatic awareness, and gentle movement to help clients expand their 'window of tolerance' and build resilience. This work is increasingly central to trauma healing, burnout recovery, and chronic illness support.",
      },
      {
        name: "Hypnotherapy",
        anchor: "hypnotherapy",
        description:
          "Clinical hypnotherapy uses guided trance states to access the subconscious mind, where deeply held beliefs, patterns, and memories reside. In this receptive state, the hypnotherapist can help the client reframe limiting beliefs, reduce phobias, manage chronic pain, support behavioral change (smoking cessation, weight loss), and process trauma. Modern hypnotherapy is far from stage performance — it is a respectful, collaborative, and evidence-informed practice.",
      },
      {
        name: "Meditation",
        anchor: "meditation",
        description:
          "Hawaii has a thriving meditation culture spanning Vipassana (insight), Zen, Tibetan Buddhist, TM (Transcendental Meditation), mindfulness-based stress reduction (MBSR), and non-dual inquiry traditions. Meditation teachers and studios across all islands offer drop-in sessions, workshops, and multi-day retreats. Research consistently demonstrates meditation's benefits for anxiety, depression, chronic pain, immune function, and cognitive performance.",
      },
      {
        name: "Breathwork",
        anchor: "breathwork",
        description:
          "Breathwork encompasses a wide range of conscious breathing practices used for healing, spiritual experience, and performance. Holotropic Breathwork (developed by Stanislav Grof) uses accelerated breathing and evocative music to access non-ordinary states of consciousness for healing. Transformational Breath uses a connected, diaphragmatic breath pattern to release suppressed emotions and open energetic flow. The Wim Hof Method combines specific breathing patterns with cold exposure for stress resilience and immune support. Pranayama — yogic breathing — encompasses dozens of techniques from the calming (Nadi Shodhana) to the activating (Kapalabhati).",
      },
    ],
  },
  {
    id: "eastern",
    title: "Eastern & Integrative Medicine",
    intro:
      "Hawaii's multicultural heritage — shaped by waves of Japanese, Chinese, Filipino, Korean, and other Asian immigrant communities — has created a uniquely fertile ground for Eastern healing traditions to take root and flourish.",
    modalities: [
      {
        name: "Acupuncture",
        anchor: "acupuncture",
        description:
          "Acupuncture is one of the cornerstones of Traditional Chinese Medicine (TCM), with a clinical history spanning over 2,500 years. Hair-thin needles are inserted at specific points along the body's meridian channels to regulate the flow of qi (vital energy), restore balance, and trigger the body's natural healing responses. Research supports its effectiveness for chronic pain, headaches, nausea, infertility, anxiety, insomnia, and digestive disorders. Hawaii has a robust community of licensed acupuncturists, many also trained in TCM herbal medicine.",
      },
      {
        name: "Traditional Chinese Medicine (TCM)",
        anchor: "tcm",
        description:
          "TCM is a complete medical system encompassing acupuncture, herbal medicine, dietary therapy, Tui Na massage, cupping, moxibustion, and Qi Gong. TCM views health as a dynamic balance of opposing forces (yin/yang) and the smooth flow of qi through meridian channels. Practitioners diagnose through pulse taking, tongue observation, and detailed intake. TCM excels in treating chronic and complex conditions that conventional medicine struggles with.",
      },
      {
        name: "Ayurveda",
        anchor: "ayurveda",
        description:
          "Ayurveda — 'the science of life' — is India's 5,000-year-old holistic medical system. It categorizes individuals into constitutional types (doshas: Vata, Pitta, Kapha) and tailors recommendations for diet, lifestyle, herbs, yoga, and therapeutic treatments (Panchakarma detox, Abhyanga oil massage, Shirodhara) accordingly. Hawaii's tropical climate shares many qualities with the Ayurvedic concept of Kapha — making Ayurvedic practices particularly useful for managing heat, humidity, and the local seasonal rhythms.",
      },
      {
        name: "Naturopathic Medicine",
        anchor: "naturopathic",
        description:
          "Naturopathic doctors (NDs) are trained in a four-year graduate medical program and combine conventional diagnostics with natural therapeutics — clinical nutrition, botanical medicine, homeopathy, physical medicine, and lifestyle counseling. The guiding principles include treating the root cause, supporting the body's inherent healing capacity (vis medicatrix naturae), and first doing no harm. NDs in Hawaii often serve as primary care providers for patients seeking an integrative approach.",
      },
      {
        name: "Functional Medicine",
        anchor: "functional-medicine",
        description:
          "Functional medicine is a systems-biology-based approach that identifies and addresses the root causes of chronic disease rather than managing symptoms. Practitioners conduct comprehensive lab testing, detailed health histories, and genomic analysis to understand the unique biochemistry of each patient. Conditions like autoimmune disease, hormonal imbalances, chronic fatigue, gut dysfunction, and metabolic disorders are common focuses.",
      },
      {
        name: "Herbalism",
        anchor: "herbalism",
        description:
          "Hawaii's extraordinarily biodiverse flora includes both indigenous medicinal plants and species brought by Pacific Islander, Asian, and Western settler communities. Clinical herbalists create individualized protocols using whole plant preparations — teas, tinctures, capsules, and topicals. Hawaiian herbalism naturally intersects with Lāʻau Lapaʻau (Native Hawaiian plant medicine), and many practitioners integrate both traditions.",
      },
    ],
  },
  {
    id: "movement",
    title: "Movement & Embodiment",
    intro:
      "Movement is medicine. Hawaii's outdoor culture, with year-round warm weather and stunning natural settings, creates ideal conditions for embodied movement practices that heal from the inside out.",
    modalities: [
      {
        name: "Yoga",
        anchor: "yoga",
        description:
          "Yoga is perhaps the most widely practiced wellness modality in Hawaii, offered across all islands in beach, studio, and retreat settings. The tradition encompasses vastly different styles: **Hatha** (foundational postures and breath), **Vinyasa** (breath-synchronized flow), **Iyengar** (precise alignment with props), **Kundalini** (energy activation through movement, breath, and mantra), **Restorative** (deeply supported poses for nervous system healing), **Yin** (long-held floor poses targeting connective tissue), and **Yoga Nidra** (guided conscious sleep for deep restoration). Many Hawaii yoga teachers weave Hawaiian spirituality, ecological awareness, or trauma sensitivity into their teaching.",
      },
      {
        name: "Fitness & Movement Coaching",
        anchor: "fitness",
        description:
          "Hawaii's active lifestyle culture has spawned a rich wellness fitness ecosystem. Movement coaches, personal trainers, and functional fitness instructors work in studios, gyms, outdoor parks, and clients' homes. Specializations include surf conditioning, paddling performance, hiking preparation, post-rehab training, and longevity-focused movement. Many practitioners in this category hold additional certifications in corrective exercise, Pilates, or strength and conditioning.",
      },
    ],
  },
  {
    id: "hawaiian-nature",
    title: "Hawaiian & Nature-Based Healing",
    intro:
      "Hawaiian healing traditions are among the most sophisticated indigenous medical systems in the world — developed over centuries of careful observation of nature, the human body, and the cosmos. These practices deserve deep respect and cultural sensitivity from practitioners and seekers alike.",
    modalities: [
      {
        name: "Lomilomi / Hawaiian Healing",
        anchor: "lomilomi",
        description:
          "Lomilomi is the traditional massage and bodywork system of Native Hawaiians, literally meaning 'to knead, to rub, or to soothe.' Far more than massage, Lomilomi is rooted in the Hawaiian philosophical system of aloha — love, harmony, and breath — and is inseparable from prayer, intention, and spiritual connection. The flowing, rhythmic strokes often use the forearms and elbows to create waves of movement through the body. Different family lineages hold distinct lomilomi traditions, some of which are still considered sacred and taught only within appropriate cultural contexts. Travelers seeking authentic lomilomi should look for Native Hawaiian practitioners or those who have trained with recognized kumu (teachers).",
      },
      {
        name: "Lāʻau Lapaʻau (Hawaiian Plant Medicine)",
        anchor: "laau-lapapau",
        description:
          "Lāʻau Lapaʻau is the Hawaiian tradition of using medicinal plants for healing. Native Hawaiian healers (kahuna lāʻau lapaʻau) had an encyclopedic knowledge of hundreds of indigenous plants and their therapeutic applications. Many traditional remedies have since been validated by modern phytochemistry. Today, a small number of dedicated practitioners — most with Native Hawaiian lineage — continue to practice this sacred art. Plants such as ʻōlena (turmeric), noni, kava, mamaki, and kukui are central to the pharmacopoeia.",
      },
      {
        name: "Hoʻoponopono",
        anchor: "hooponopono",
        description:
          "Hoʻoponopono is a Native Hawaiian practice of reconciliation, forgiveness, and healing relationships. Traditionally facilitated by a kahuna (healing priest) within a family group, modern adaptations include individual therapeutic practice using the four-phrase protocol: 'I love you. I'm sorry. Please forgive me. Thank you.' Whether used in group settings, individual therapy, or as a personal daily practice, Hoʻoponopono addresses the energetic and relational roots of illness, conflict, and suffering.",
      },
      {
        name: "Nature Therapy",
        anchor: "nature-therapy",
        description:
          "Hawaii is one of the world's great natural healing environments — ancient rainforests, volcanic landscapes, coral reefs, and open ocean all within a short drive. Nature therapy modalities include forest bathing (Shinrin-yoku), ocean therapy, eco-therapy, and guided nature immersion experiences. Research consistently shows that time in natural environments reduces cortisol, lowers blood pressure, boosts NK cell activity, and restores directed-attention capacity. Hawaii practitioners guide clients into mindful connection with the natural world as a core healing modality.",
      },
      {
        name: "Art Therapy",
        anchor: "art-therapy",
        description:
          "Art therapy uses the creative process of making art — drawing, painting, sculpture, collage, and mixed media — as a therapeutic tool. The creative process itself is healing: it bypasses the verbal defenses of the conscious mind, externalizes inner experience, and allows for the processing of emotions that are difficult to express in words. Art therapists in Hawaii often integrate local natural materials, Hawaiian symbols, and cultural imagery into their therapeutic work.",
      },
    ],
  },
  {
    id: "nutrition-longevity",
    title: "Nutrition & Longevity",
    intro:
      "Food as medicine has deep roots in both Hawaiian tradition and modern functional health science. Hawaii's agricultural richness — tropical fruits, local vegetables, fresh fish, and traditional staple crops — provides an extraordinary foundation for nutritional healing.",
    modalities: [
      {
        name: "Nutrition Counseling",
        anchor: "nutrition",
        description:
          "Registered Dietitians (RDs) and Certified Nutrition Specialists (CNS) in Hawaii offer evidence-based nutritional counseling for a wide range of conditions — metabolic syndrome, gut health, hormonal imbalances, eating disorders, and athletic performance. Many practitioners integrate functional nutrition testing (microbiome analysis, food sensitivity panels, nutrient status) with dietary counseling. Hawaii's traditional diet — centered on poi, fish, sweet potato, and taro — is increasingly recognized as a highly nutritious, anti-inflammatory template.",
      },
      {
        name: "Longevity & Preventive Medicine",
        anchor: "longevity",
        description:
          "Longevity medicine focuses on extending healthspan — the number of years lived in good health — rather than simply lifespan. Hawaii already has one of the longest life expectancies in the United States, often attributed to its multicultural diet, strong social connections, and outdoor lifestyle. Longevity practitioners offer comprehensive health optimization: advanced biomarker testing, HRV assessment, sleep optimization, hormone balancing, peptide protocols, and evidence-based supplementation strategies.",
      },
    ],
  },
  {
    id: "life-soul",
    title: "Life Guidance & Soul Work",
    intro:
      "Hawaii has long been a gathering place for seekers, visionaries, and those called to deeper purpose. This cluster of practices addresses the existential, spiritual, and soul dimensions of human experience.",
    modalities: [
      {
        name: "Life Coaching",
        anchor: "life-coaching",
        description:
          "Life coaches partner with clients to clarify their vision, identify obstacles, build accountability, and design a path toward their goals. Unlike therapy, coaching is generally present- and future-focused rather than working with the past. Hawaii's coaching community is diverse — spanning executive coaches, wellness coaches, spiritual life coaches, relationship coaches, and purpose coaches. Many Hawaii coaches integrate Hawaiian values such as mālama (care/stewardship) and pono (righteousness/alignment) into their methodology.",
      },
      {
        name: "Soul Guidance & Intuitive Healing",
        anchor: "soul-guidance",
        description:
          "Soul guidance encompasses readings, energy assessments, akashic record work, channeling, and intuitive coaching that address the soul's journey, purpose, and growth. Practitioners in this category work at the intersection of spirituality, psychology, and energy awareness. Hawaii's sacred land and strong spiritual traditions attract many gifted intuitives and soul workers from around the world.",
      },
      {
        name: "Astrology",
        anchor: "astrology",
        description:
          "Astrology is one of humanity's oldest symbolic systems — a map of cosmic cycles and their correspondence to individual and collective human experience. Astrologers in Hawaii offer natal chart readings, transit and progression forecasts, synastry (relationship compatibility), and evolutionary astrology that explores the soul's deeper themes and growth edges. Modern astrologers increasingly integrate psychological frameworks with traditional astrological symbolism.",
      },
      {
        name: "Psychic & Intuitive Services",
        anchor: "psychic",
        description:
          "Hawaii has a rich tradition of psychic and intuitive practitioners — tarot readers, mediums, oracle card practitioners, and clairvoyants. Whether approached as tools for self-reflection, spiritual guidance, or literal communication with other dimensions of reality, these practices have served human beings across every culture for millennia. Hawaii's open, spiritually-oriented culture creates a welcoming environment for these services.",
      },
    ],
  },
  {
    id: "womens-health",
    title: "Womenʻs Health & Birth Support",
    intro:
      "Hawaii has a thriving community of practitioners specializing in womenʻs health across the full arc of the feminine lifecycle — from fertility and pregnancy through birth, postpartum, and menopause.",
    modalities: [
      {
        name: "Womenʻs Health",
        anchor: "womens-health",
        description:
          "Practitioners specializing in womenʻs health address the unique physiological, hormonal, and psychosocial dimensions of the feminine experience. This includes functional gynecology, hormonal balance, pelvic floor physical therapy, fertility support, endometriosis and PCOS care, perimenopause and menopause navigation, and sexual health. Many Hawaii practitioners bring both clinical expertise and a holistic, trauma-informed lens to this deeply personal work.",
      },
      {
        name: "Birth Doula",
        anchor: "birth-doula",
        description:
          "Birth doulas provide continuous non-medical support to birthing people before, during, and immediately after labor. Research consistently shows that doula support reduces cesarean rates, shortens labor duration, improves satisfaction with the birth experience, and reduces use of pain medication. Hawaii doulas often integrate Hawaiian birth traditions, water birth facilitation, and sacred space-holding into their practice.",
      },
      {
        name: "Midwifery",
        anchor: "midwifery",
        description:
          "Certified Nurse-Midwives (CNMs) and Licensed Midwives (LMs) in Hawaii provide comprehensive maternity care — from prenatal visits through birth and postpartum care. Home birth and birth center births attended by midwives are increasingly popular in Hawaii as an alternative to hospital birth. Hawaii's midwifery community has strong roots in both indigenous Hawaiian birth traditions and evidence-based midwifery practice.",
      },
    ],
  },
];

const ISLAND_SECTIONS = [
  {
    name: "Oʻahu",
    description:
      "As Hawaii's most populous island and home to Honolulu, Oʻahu has the most extensive wellness ecosystem — from large wellness centers in Kailua to boutique studios in Mānoa. The North Shore offers a surf-culture wellness scene, while Honolulu's urban core has sophisticated integrative medicine clinics.",
    link: "/oahu",
  },
  {
    name: "Maui",
    description:
      "Maui's wellness scene is centered in Paia, Makawao (the 'wellness town' of Upcountry), and Kihei. The island attracts an unusually high concentration of gifted healers across every tradition — from Hawaiian healing lineages to cutting-edge functional medicine and consciousness-expanding retreats in Hāna.",
    link: "/maui",
  },
  {
    name: "Big Island",
    description:
      "The Big Island's volcanic energy and diverse microclimates — from the rainforests of Puna to the dry slopes of Kona — create distinct healing communities across the island. Kailua-Kona has a robust integrative medicine scene; Pahoa and Hilo attract practitioners drawn to the island's powerful, transformative earth energy.",
    link: "/big-island",
  },
  {
    name: "Kauaʻi",
    description:
      "Kauaʻi's remote beauty and strong aloha ʻāina (love of the land) culture attract deeply rooted practitioners. The North Shore (Hanalei) and Kīlauea have concentrations of yoga teachers, energy healers, and nature-based practitioners. Kauaʻi's small size and tight-knit community mean word-of-mouth recommendations are especially reliable.",
    link: "/kauai",
  },
];

const FAQ_ITEMS = [
  {
    q: "What wellness modalities are most popular in Hawaii?",
    a: "Massage therapy (especially Lomilomi), yoga, acupuncture, and energy healing (particularly Reiki and sound healing) are among the most widely practiced modalities across Hawaii. Native Hawaiian healing traditions — Lomilomi, Lāʻau Lapaʻau, and Hoʻoponopono — are unique to the islands.",
  },
  {
    q: "How do I find a qualified wellness practitioner in Hawaii?",
    a: "The Hawaiʻi Wellness Directory lists vetted practitioners across all four main islands, filterable by modality, island, city, and session type. For licensed modalities (acupuncture, chiropractic, physical therapy, naturopathic medicine), verify credentials through the Hawaii Professional and Vocational Licensing Division (PVL).",
  },
  {
    q: "Are there Hawaii-specific healing traditions I should know about?",
    a: "Yes. Lomilomi (Hawaiian massage), Lāʻau Lapaʻau (Hawaiian plant medicine), and Hoʻoponopono (forgiveness and reconciliation practice) are indigenous Hawaiian healing systems. These traditions deserve cultural respect — seek out Native Hawaiian practitioners or those who have trained in appropriate cultural lineages.",
  },
  {
    q: "What is the difference between a wellness practitioner and a licensed healthcare provider?",
    a: "Licensed healthcare providers (MDs, DOs, NDs, chiropractors, acupuncturists, PTs, psychologists, LCSWs) have completed accredited degree programs and passed licensing exams regulated by state boards. Wellness practitioners (life coaches, Reiki practitioners, yoga teachers) may hold certifications but are not licensed healthcare providers. Both have value — understanding the distinction helps you choose the right type of support.",
  },
  {
    q: "Can I find online wellness sessions with Hawaii practitioners?",
    a: "Yes. Many Hawaii practitioners offer virtual sessions — particularly for modalities like life coaching, psychotherapy, nutritional counseling, astrology, and some energy healing practices. Use the 'Online' session type filter in the Hawaiʻi Wellness Directory to find virtual-friendly practitioners.",
  },
  {
    q: "Which island has the most wellness practitioners?",
    a: "Oʻahu has the largest number of practitioners due to its population size. However, Maui (particularly the Upcountry region and Paia) and the Big Island (Kona and Puna) have notably dense wellness communities relative to their populations, with high concentrations of specialized and indigenous healing practitioners.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Complementary Modalities data
// ─────────────────────────────────────────────────────────────────────────────

interface AilmentPairing {
  need: string;
  description: string;
  modalities: { name: string; anchor: string }[];
}

interface ModalityPairing {
  a: string;
  b: string;
  anchorA: string;
  anchorB: string;
  why: string;
}

const AILMENT_PAIRINGS: AilmentPairing[] = [
  {
    need: "Chronic Pain",
    description: "Pain with both physical and nervous system components responds best to multi-modal care.",
    modalities: [
      { name: "Massage Therapy", anchor: "massage" },
      { name: "Acupuncture", anchor: "acupuncture" },
      { name: "Physical Therapy", anchor: "physical-therapy" },
      { name: "Craniosacral Therapy", anchor: "craniosacral" },
    ],
  },
  {
    need: "Anxiety & Stress",
    description: "Nervous system regulation happens below the thinking mind — these modalities reach there.",
    modalities: [
      { name: "Breathwork", anchor: "breathwork" },
      { name: "Somatic Therapy", anchor: "somatic-therapy" },
      { name: "Meditation", anchor: "meditation" },
      { name: "Reiki", anchor: "reiki" },
    ],
  },
  {
    need: "Trauma Recovery",
    description: "Trauma lives in both body and mind — complete healing addresses both dimensions.",
    modalities: [
      { name: "Psychotherapy", anchor: "psychotherapy" },
      { name: "Somatic Therapy", anchor: "somatic-therapy" },
      { name: "Nervous System Regulation", anchor: "nervous-system" },
      { name: "Breathwork", anchor: "breathwork" },
    ],
  },
  {
    need: "Burnout & Fatigue",
    description: "Deep exhaustion often has roots in nervous system depletion and unaddressed grief.",
    modalities: [
      { name: "Nervous System Regulation", anchor: "nervous-system" },
      { name: "Lomilomi", anchor: "lomilomi" },
      { name: "Sound Healing", anchor: "sound-healing" },
      { name: "Functional Medicine", anchor: "functional-medicine" },
    ],
  },
  {
    need: "Digestive & Gut Health",
    description: "The gut-brain axis connects digestion to mental, immune, and hormonal health.",
    modalities: [
      { name: "Functional Medicine", anchor: "functional-medicine" },
      { name: "TCM", anchor: "tcm" },
      { name: "Naturopathic Medicine", anchor: "naturopathic" },
      { name: "Nutrition Counseling", anchor: "nutrition" },
    ],
  },
  {
    need: "Spiritual Growth",
    description: "Hawaiʻi's sacred landscapes and healing traditions deepen any path of inner inquiry.",
    modalities: [
      { name: "Meditation", anchor: "meditation" },
      { name: "Lomilomi", anchor: "lomilomi" },
      { name: "Hoʻoponopono", anchor: "hooponopono" },
      { name: "Soul Guidance", anchor: "soul-guidance" },
    ],
  },
  {
    need: "Movement & Recovery",
    description: "Active bodies need conditioning, structural support, and intentional restoration.",
    modalities: [
      { name: "Yoga", anchor: "yoga" },
      { name: "Physical Therapy", anchor: "physical-therapy" },
      { name: "Chiropractic", anchor: "chiropractic" },
      { name: "Massage Therapy", anchor: "massage" },
    ],
  },
  {
    need: "Hormonal Balance",
    description: "Hormonal health is shaped by stress, nutrition, environment, and lifestyle together.",
    modalities: [
      { name: "Functional Medicine", anchor: "functional-medicine" },
      { name: "Ayurveda", anchor: "ayurveda" },
      { name: "Acupuncture", anchor: "acupuncture" },
      { name: "Naturopathic Medicine", anchor: "naturopathic" },
    ],
  },
];

const MODALITY_PAIRINGS: ModalityPairing[] = [
  {
    a: "Psychotherapy",
    b: "Somatic Therapy",
    anchorA: "psychotherapy",
    anchorB: "somatic-therapy",
    why: "Talk therapy and body-based work address trauma from both the cognitive and physical dimensions — together, they reach parts that neither can alone.",
  },
  {
    a: "Acupuncture",
    b: "Herbalism",
    anchorA: "acupuncture",
    anchorB: "herbalism",
    why: "Complementary pillars of TCM: needles address energy flow in the meridian system while herbs address internal biochemistry and constitutional balance.",
  },
  {
    a: "Lomilomi",
    b: "Hoʻoponopono",
    anchorA: "lomilomi",
    anchorB: "hooponopono",
    why: "Both are rooted in Native Hawaiian philosophy — bodywork releases physical holding while forgiveness practice resolves relational and spiritual roots of suffering.",
  },
  {
    a: "Breathwork",
    b: "Nervous System Regulation",
    anchorA: "breathwork",
    anchorB: "nervous-system",
    why: "Breathwork creates acute nervous system shifts; regulation work builds the long-term capacity to hold those states and expand the window of tolerance.",
  },
  {
    a: "Yoga",
    b: "Meditation",
    anchorA: "yoga",
    anchorB: "meditation",
  why: "Movement practice prepares the body for stillness; meditation deepens the self-awareness that yoga cultivates — each potentiates the other.",
  },
  {
    a: "Functional Medicine",
    b: "Nutrition Counseling",
    anchorA: "functional-medicine",
    anchorB: "nutrition",
    why: "Advanced lab testing reveals biochemical imbalances; nutritional counseling translates those findings into sustainable daily practice.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Editorial CSS
// ─────────────────────────────────────────────────────────────────────────────

const editorialCss = `
  .mod-chapter {
    font-family: 'Source Sans 3', system-ui, sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: hsl(15, 65%, 52%);
  }
  .mod-category-h {
    font-family: 'Playfair Display', Georgia, serif;
    font-weight: 500;
    font-size: clamp(26px, 3.2vw, 40px);
    line-height: 1.12;
    letter-spacing: -0.01em;
  }
  .mod-modality-h {
    font-family: 'Playfair Display', Georgia, serif;
    font-weight: 500;
    font-size: clamp(18px, 1.8vw, 22px);
    line-height: 1.2;
    letter-spacing: -0.005em;
  }
  .mod-sub-name {
    font-family: 'Playfair Display', Georgia, serif;
    font-style: italic;
    font-weight: 500;
    font-size: 16px;
    line-height: 1.35;
  }
  .mod-pull-quote {
    font-family: 'Playfair Display', Georgia, serif;
    font-style: italic;
    font-weight: 400;
    font-size: clamp(20px, 2.5vw, 28px);
    line-height: 1.48;
    letter-spacing: -0.005em;
  }
  .mod-toc-heading {
    font-family: 'Playfair Display', Georgia, serif;
    font-weight: 500;
    font-size: 17px;
    letter-spacing: -0.004em;
  }
  .mod-island-h {
    font-family: 'Playfair Display', Georgia, serif;
    font-weight: 500;
    font-size: clamp(20px, 2.2vw, 26px);
    line-height: 1.2;
  }
  .mod-faq-q {
    font-family: 'Playfair Display', Georgia, serif;
    font-weight: 500;
    font-size: 17px;
    line-height: 1.4;
  }
  .mod-need-h {
    font-family: 'Playfair Display', Georgia, serif;
    font-weight: 500;
    font-size: 18px;
    line-height: 1.25;
  }
  .mod-pair-names {
    font-family: 'Playfair Display', Georgia, serif;
    font-style: italic;
    font-weight: 500;
    font-size: 17px;
    line-height: 1.3;
  }
  .mod-intro::first-letter {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 56px;
    float: left;
    line-height: 0.88;
    padding: 6px 10px 0 0;
    color: hsl(15, 65%, 52%);
    font-weight: 500;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedDescription {
  lead: string;
  subs: { name: string; desc: string }[];
}

function parseDescription(raw: string): ParsedDescription {
  const parts = raw.split(/\*\*(.*?)\*\*/);
  if (parts.length <= 1) return { lead: raw.trim(), subs: [] };
  const lead = parts[0].trim();
  const subs: { name: string; desc: string }[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const name = parts[i].trim();
    const desc = (parts[i + 1] || "")
      .trim()
      .replace(/^,\s*/, "")
      .replace(/^;\s*/, "")
      .replace(/^and\s+/i, "")
      .replace(/[,;]\s*(and\s+)?$/i, "")
      .trim();
    if (name) subs.push({ name, desc });
  }
  return { lead, subs };
}

function getCategoryIcon(id: string) {
  const cls = "h-[18px] w-[18px] shrink-0";
  const sw = 1.5;
  switch (id) {
    case "bodywork":           return <Hand className={cls} strokeWidth={sw} />;
    case "energy":             return <Sparkles className={cls} strokeWidth={sw} />;
    case "mind-nervous-system":return <Brain className={cls} strokeWidth={sw} />;
    case "eastern":            return <Leaf className={cls} strokeWidth={sw} />;
    case "movement":           return <Activity className={cls} strokeWidth={sw} />;
    case "hawaiian-nature":    return <Sun className={cls} strokeWidth={sw} />;
    case "nutrition-longevity":return <Apple className={cls} strokeWidth={sw} />;
    case "life-soul":          return <Moon className={cls} strokeWidth={sw} />;
    case "womens-health":      return <Heart className={cls} strokeWidth={sw} />;
    default: return null;
  }
}

const PULL_QUOTES: Record<number, { text: string; attribution: string }> = {
  0: {
    text: "The doctor of the future will give no medicine, but will interest his patients in the care of the human frame, in diet, and in the cause and prevention of disease.",
    attribution: "Thomas Edison",
  },
  2: {
    text: "The body keeps the score — mind, brain, and body in the transformation of trauma.",
    attribution: "Bessel van der Kolk, MD",
  },
  5: {
    text: "Nānā i ke kumu — Look to the source.",
    attribution: "Hawaiian proverb",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function PullQuote({ text, attribution }: { text: string; attribution: string }) {
  return (
    <blockquote className="my-14 pl-7 border-l-[3px] border-primary py-1">
      <p className="mod-pull-quote text-foreground">&ldquo;{text}&rdquo;</p>
      <footer className="mt-4 mod-chapter" style={{ color: "hsl(35, 12%, 55%)" }}>
        — {attribution}
      </footer>
    </blockquote>
  );
}

function ModalityCard({ mod }: { mod: Modality }) {
  const { lead, subs } = parseDescription(mod.description);
  return (
    <article id={mod.anchor} className="scroll-mt-20">
      <div className="flex border border-[hsl(35,18%,82%)] bg-background">
        <div className="w-[3px] shrink-0 bg-primary" />
        <div className="flex-1">
          <div className="border-b border-[hsl(35,18%,82%)] px-6 py-4 sm:px-8">
            <h3 className="mod-modality-h text-foreground">{mod.name}</h3>
          </div>
          <div className="px-6 py-5 sm:px-8">
            {lead && (
              <p className="text-[15.5px] leading-[1.75] text-muted-foreground">
                {lead}
              </p>
            )}
            {subs.length > 0 && (
              <div className="mt-5 divide-y divide-[hsl(35,15%,88%)]">
                {subs.map((sub) => (
                  <div key={sub.name} className="py-4">
                    <div className="mod-sub-name text-foreground mb-1">{sub.name}</div>
                    {sub.desc && (
                      <p className="text-[14.5px] leading-[1.72] text-muted-foreground">
                        {sub.desc}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-5 pt-4 border-t border-[hsl(35,18%,82%)]">
              <Link
                to={`/directory?modality=${encodeURIComponent(mod.name)}`}
                className="mod-chapter transition-opacity hover:opacity-60"
              >
                Find {mod.name} practitioners in Hawaiʻi →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function CategorySection({ cat, catIdx }: { cat: Category; catIdx: number }) {
  const [expanded, setExpanded] = useState(false);
  const pullQuote = PULL_QUOTES[catIdx];
  const showCTA = catIdx === 3;

  return (
    <section id={cat.id} className="mb-20 scroll-mt-20">
      {/* Header — thick rule, chapter number, icon, title */}
      <div className="mb-6 border-t-2 border-foreground pt-6">
        <div className="mb-2 flex items-center gap-3 text-primary">
          <span className="mod-chapter">{String(catIdx + 1).padStart(2, "0")}</span>
          {getCategoryIcon(cat.id)}
        </div>
        <h2 className="mod-category-h text-foreground">{cat.title}</h2>
      </div>

      {/* Intro — always visible */}
      <p className="mb-7 max-w-[660px] text-[17px] leading-[1.78] text-muted-foreground">
        {cat.intro}
      </p>

      {/* Expand/collapse toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2.5 mb-8 transition-opacity hover:opacity-70"
        aria-expanded={expanded}
      >
        <span className="mod-chapter">
          {expanded
            ? `Collapse`
            : `Explore ${cat.modalities.length} modalities`}
        </span>
        {expanded
          ? <ChevronUp className="h-3 w-3 text-primary" strokeWidth={2.5} />
          : <ChevronDown className="h-3 w-3 text-primary" strokeWidth={2.5} />}
      </button>

      {/* Modality cards — accordion */}
      {expanded && (
        <div className="space-y-5">
          {cat.modalities.map((mod) => (
            <ModalityCard key={mod.anchor} mod={mod} />
          ))}

          {showCTA && (
            <div className="mt-10">
              <GuideCTA
                variant="mid"
                headline="Looking for a specific modality?"
                body="Search the Hawaiʻi Wellness Directory by modality, island, and session type to find your practitioner."
              />
            </div>
          )}
        </div>
      )}

      {/* Pull quote — always visible, acts as section divider */}
      {pullQuote && <PullQuote text={pullQuote.text} attribution={pullQuote.attribution} />}
    </section>
  );
}

function ComplementarySection() {
  return (
    <section className="mb-20">
      {/* Header */}
      <div className="mb-8 border-t-2 border-foreground pt-6">
        <div className="mb-1 mod-chapter">Finding Your Path</div>
        <h2 className="mod-category-h text-foreground">
          Complementary Modalities
        </h2>
      </div>

      <p className="mb-12 max-w-[660px] text-[17px] leading-[1.78] text-muted-foreground">
        Healing rarely happens in a single modality. The most effective journeys combine practices that reinforce each other — addressing the body, nervous system, and root causes together. Here's where to start based on what you're seeking.
      </p>

      {/* By need — responsive grid */}
      <div className="mb-16">
        <div className="mb-7 mod-chapter" style={{ color: "hsl(35, 12%, 55%)" }}>
          Starting Points by Need
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {AILMENT_PAIRINGS.map((item) => (
            <div
              key={item.need}
              className="border border-[hsl(35,18%,82%)] bg-background p-5"
            >
              <div className="mod-need-h text-foreground mb-2">{item.need}</div>
              <p className="text-[13px] leading-[1.6] text-muted-foreground mb-4">
                {item.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {item.modalities.map((m) => (
                  <a
                    key={m.anchor}
                    href={`#${m.anchor}`}
                    className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary border border-primary/30 px-2.5 py-1 hover:bg-primary hover:text-white transition-colors"
                  >
                    {m.name}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Natural pairings */}
      <div>
        <div className="mb-7 mod-chapter" style={{ color: "hsl(35, 12%, 55%)" }}>
          Natural Pairings
        </div>
        <div className="border-t border-[hsl(35,18%,80%)]">
          {MODALITY_PAIRINGS.map((pair) => (
            <div
              key={`${pair.a}-${pair.b}`}
              className="grid sm:grid-cols-[220px_1fr] gap-4 sm:gap-10 py-6 border-b border-[hsl(35,18%,80%)]"
            >
              <div>
                <div className="mod-pair-names text-foreground">
                  <a href={`#${pair.anchorA}`} className="hover:text-primary transition-colors">
                    {pair.a}
                  </a>
                  <span className="mx-2 not-italic font-light text-muted-foreground">+</span>
                  <a href={`#${pair.anchorB}`} className="hover:text-primary transition-colors">
                    {pair.b}
                  </a>
                </div>
              </div>
              <p className="text-[15px] leading-[1.72] text-muted-foreground">{pair.why}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TableOfContents() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="mb-12 border border-[hsl(35,18%,80%)]" style={{ background: "hsl(35, 22%, 97%)" }}>
      <button
        className="flex w-full items-center justify-between px-6 py-5 text-left"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="mod-toc-heading text-foreground">Table of Contents</span>
        <span className="mod-chapter flex items-center gap-1.5" style={{ color: "hsl(35, 12%, 55%)" }}>
          {open ? <><ChevronUp className="h-3 w-3" /> Close</> : <><ChevronDown className="h-3 w-3" /> Open</>}
        </span>
      </button>
      {open && (
        <div className="border-t border-[hsl(35,18%,80%)] px-6 pb-6 pt-2">
          <ol className="grid sm:grid-cols-2 gap-0">
            {CATEGORIES.map((cat, i) => (
              <li key={cat.id} className="border-b border-[hsl(35,18%,80%)]">
                <a
                  href={`#${cat.id}`}
                  className="flex items-center gap-4 py-3 text-foreground hover:text-primary transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <span className="mod-chapter shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[14px] leading-snug">{cat.title}</span>
                </a>
              </li>
            ))}
            <li className="border-b border-[hsl(35,18%,80%)]">
              <a href="#complementary" className="flex items-center gap-4 py-3 text-foreground hover:text-primary transition-colors" onClick={() => setOpen(false)}>
                <span className="mod-chapter shrink-0">{String(CATEGORIES.length + 1).padStart(2, "0")}</span>
                <span className="text-[14px]">Complementary Modalities</span>
              </a>
            </li>
            <li className="border-b border-[hsl(35,18%,80%)]">
              <a href="#by-island" className="flex items-center gap-4 py-3 text-foreground hover:text-primary transition-colors" onClick={() => setOpen(false)}>
                <span className="mod-chapter shrink-0">{String(CATEGORIES.length + 2).padStart(2, "0")}</span>
                <span className="text-[14px]">Wellness by Island</span>
              </a>
            </li>
            <li>
              <a href="#faq" className="flex items-center gap-4 py-3 text-foreground hover:text-primary transition-colors" onClick={() => setOpen(false)}>
                <span className="mod-chapter shrink-0">{String(CATEGORIES.length + 3).padStart(2, "0")}</span>
                <span className="text-[14px]">FAQ</span>
              </a>
            </li>
          </ol>
        </div>
      )}
    </nav>
  );
}

function FaqAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div className="divide-y divide-[hsl(35,18%,80%)] border-y border-[hsl(35,18%,80%)]">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i}>
          <button
            className="flex w-full items-start justify-between gap-6 py-6 text-left group"
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            aria-expanded={openIdx === i}
          >
            <span className="mod-faq-q text-foreground group-hover:text-primary transition-colors flex-1">
              {item.q}
            </span>
            <span className="mod-chapter shrink-0 mt-0.5 transition-colors group-hover:text-primary"
              style={{ color: "hsl(35, 12%, 55%)" }}>
              {openIdx === i ? "Close" : "Read"}
            </span>
          </button>
          {openIdx === i && (
            <div className="pb-6 text-[15.5px] leading-[1.75] text-muted-foreground border-t border-[hsl(35,18%,80%)] pt-4">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON-LD schemas
// ─────────────────────────────────────────────────────────────────────────────

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: guide.seoTitle,
  description: guide.description,
  url: CANONICAL,
  datePublished: guide.publishedAt,
  dateModified: guide.updatedAt,
  image: `https://hawaiiwellness.net${guide.ogImage}`,
  author: { "@type": "Organization", name: "Hawaiʻi Wellness", url: "https://hawaiiwellness.net" },
  publisher: {
    "@type": "Organization",
    name: "Hawaiʻi Wellness",
    url: "https://hawaiiwellness.net",
    logo: { "@type": "ImageObject", url: "https://hawaiiwellness.net/hawaii-wellness-logo.png" },
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://hawaiiwellness.net" },
    { "@type": "ListItem", position: 2, name: "Guides", item: "https://hawaiiwellness.net/guides" },
    { "@type": "ListItem", position: 3, name: "Wellness Modalities in Hawaiʻi", item: CANONICAL },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function WellnessModalities() {
  usePageMeta(
    guide.seoTitle,
    guide.description,
    `https://hawaiiwellness.net${guide.ogImage}`,
    "article"
  );

  return (
    <>
      <JsonLd id="guide-article" data={articleSchema} />
      <JsonLd id="guide-faq" data={faqSchema} />
      <JsonLd id="guide-breadcrumb" data={breadcrumbSchema} />
      <style dangerouslySetInnerHTML={{ __html: editorialCss }} />

      {/* ── Hero ── plain untitled image; page has its own H1 */}
      <div className="relative h-[480px] sm:h-[580px] overflow-hidden">
        <img
          src="/complete-health-modalities-guide.jpg"
          alt="Pololū Valley, Big Island — Hawaiʻi Wellness Modalities Guide"
          className="absolute inset-0 h-full w-full object-cover object-center"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="relative flex h-full flex-col justify-end px-6 pb-12 sm:px-12 sm:pb-16 max-w-5xl mx-auto">
          <nav className="mb-5 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/60">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link to="/guides" className="hover:text-white transition-colors">Guides</Link>
            <span>/</span>
            <span className="text-white/80">Wellness Modalities</span>
          </nav>
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
            The Complete Guide · Hawaiʻi
          </div>
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 500,
              fontSize: "clamp(28px, 4.5vw, 52px)",
              lineHeight: 1.08,
              letterSpacing: "-0.015em",
              color: "white",
            }}
          >
            Wellness Modalities<br />
            <em style={{ fontStyle: "italic", fontWeight: 400, color: "hsl(15, 70%, 72%)" }}>
              in Hawaiʻi
            </em>
          </h1>
          <p className="mt-4 max-w-2xl text-white/75 text-[15px] sm:text-base leading-relaxed">
            Your definitive reference for holistic healing across the Hawaiian Islands — 44 modalities, 9 traditions, island-by-island guidance.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-[11px] uppercase tracking-[0.18em] text-white/55">
            <span>44 Modalities</span>
            <span>·</span>
            <span>4 Islands</span>
            <span>·</span>
            <span>{guide.readMinutes} min read</span>
            <span>·</span>
            <span>Updated {new Date(guide.updatedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6">

        {/* Intro with drop cap */}
        <section className="mb-12 max-w-[720px]">
          <p className="mod-intro text-[17px] leading-[1.78] text-muted-foreground">
            Hawaii is one of the world's great centers of holistic healing. The islands' multicultural heritage —
            Native Hawaiian traditions, Japanese, Chinese, Filipino, and Western influences — has produced a
            wellness ecosystem of extraordinary breadth and depth. Whether you're a visitor seeking a restorative
            experience or a resident managing a chronic health challenge, this guide will help you navigate the
            full landscape of healing modalities available across Oʻahu, Maui, the Big Island, and Kauaʻi.
          </p>
        </section>

        <TableOfContents />

        {/* ── Category sections (accordion) ── */}
        {CATEGORIES.map((cat, catIdx) => (
          <CategorySection key={cat.id} cat={cat} catIdx={catIdx} />
        ))}

        {/* ── Complementary Modalities ── */}
        <div id="complementary" className="scroll-mt-20">
          <ComplementarySection />
        </div>

        {/* ── By Island ── */}
        <section id="by-island" className="mb-20 scroll-mt-20">
          <div className="mb-8 border-t-2 border-foreground pt-6">
            <div className="mb-1 mod-chapter">{String(CATEGORIES.length + 2).padStart(2, "0")}</div>
            <h2 className="mod-category-h text-foreground">Wellness by Island</h2>
          </div>
          <p className="mb-10 max-w-[660px] text-[17px] leading-[1.78] text-muted-foreground">
            Each Hawaiian island has its own distinct wellness character, shaped by its geography, communities,
            and cultural heritage.
          </p>
          <div className="border-t border-[hsl(35,18%,80%)]">
            {ISLAND_SECTIONS.map((island) => (
              <div key={island.name} className="grid sm:grid-cols-[180px_1fr] gap-6 sm:gap-10 py-9 border-b border-[hsl(35,18%,80%)]">
                <h3 className="mod-island-h text-foreground">{island.name}</h3>
                <div>
                  <p className="text-[16px] leading-[1.75] text-muted-foreground mb-4">{island.description}</p>
                  <Link to={island.link} className="mod-chapter transition-opacity hover:opacity-60">
                    Browse {island.name} practitioners →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="mb-16 scroll-mt-20">
          <div className="mb-8 border-t-2 border-foreground pt-6">
            <div className="mb-1 mod-chapter">{String(CATEGORIES.length + 3).padStart(2, "0")}</div>
            <h2 className="mod-category-h text-foreground">Frequently Asked Questions</h2>
          </div>
          <p className="mb-10 max-w-[660px] text-[17px] leading-[1.78] text-muted-foreground">
            Common questions about wellness modalities and finding practitioners in Hawaiʻi.
          </p>
          <FaqAccordion />
        </section>

        <GuideCTA variant="end" />
      </main>
    </>
  );
}
