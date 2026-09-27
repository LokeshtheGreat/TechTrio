from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import re
from collections import defaultdict

analyzer = SentimentIntensityAnalyzer()

custom_lexicon = {
    # negative
    "overheating": -2.5,
    "overheats": -2.5,
    "heating": -2.0,
    "drain": -2.0,
    "draining": -2.0,
    "drains": -2.0,
    "lag": -2.5,
    "laggy": -2.5,
    "stuttering": -2.0,
    "slow": -1.5,
    "issue": -2.0,
    "crash": -2.5,
    "crashing": -2.5,
    "freeze": -2.0,
    "freezing": -2.0,
    "hang": -2.0,
    "hanging": -2.0,
    "slow-charging": -2.5,
    "charging-slow": -2.5,
    "charging-issue": -2.5,
    "display-issue": -2.5,
    "technical-issue": -2.5,
    "battery-issue": -2.5,
    "battery-drain": -2.5,
    
    # positive
    "stellar": 2.5,
    "killer": 2.0,
    "beast": 2.5,
    "beastly": 2.5,
    "buttery": 2.0,
    "smooth": 2.0,
    "mind-blowing": 3.0,
    "killer-upgrade": 3.0,
    "buttery-smooth": 3.0,
    "quick": 2.0,
    "fast": 2.0
}

analyzer.lexicon.update(custom_lexicon)

ASPECTS = {
    "Battery": ["battery", "charge", "charging", "power", "life", "backup", "mah", "drain"],
    "Camera": ["camera", "photo", "picture", "video", "lens", "zoom", "night mode", "portrait", "ultrawide", "megapixel", "mp"],
    "Performance": ["performance", "speed", "lag", "fast", "slow", "smooth", "processor", "ram", "gaming", "heat", "heating", "snapdragon"],
    "Display": ["display", "screen", "brightness", "colors", "amoled", "hz", "refresh", "touch"],
    "Value": ["value", "price", "worth", "cost", "money", "budget", "expensive", "cheap"],
    "Software": ["software", "update", "ui", "bug", "glitch", "os", "android", "bloatware", "ios", "ads"]
}

STOP_WORDS = set([
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", 
    "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers", 
    "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves", 
    "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are", 
    "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", 
    "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until", 
    "while", "of", "at", "by", "for", "with", "about", "against", "between", "into", 
    "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", 
    "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here", 
    "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", 
    "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", 
    "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now",
    "phone", "mobile", "smartphone", "device", "product", "good", "bad", "great"
])

def analyze_sentiment(text):
    if not text:
        return {"label": "Neutral", "score": 0.0, "aspects": {}, "keywords": []}
        
    # Preprocess idioms
    text_proc = re.sub(r'(?i)\bmind\s+blowing\b', 'mind-blowing', text)
    text_proc = re.sub(r'(?i)\bslow\s+charging\b', 'slow-charging', text_proc)
    text_proc = re.sub(r'(?i)\bcharging\s+slow\b', 'charging-slow', text_proc)
    text_proc = re.sub(r'(?i)\bcharging\s+issue\b', 'charging-issue', text_proc)
    text_proc = re.sub(r'(?i)\bdisplay\s+issue\b', 'display-issue', text_proc)
    text_proc = re.sub(r'(?i)\btechnical\s+issue\b', 'technical-issue', text_proc)
    text_proc = re.sub(r'(?i)\bbattery\s+issue\b', 'battery-issue', text_proc)
    text_proc = re.sub(r'(?i)\bbattery\s+drain\b', 'battery-drain', text_proc)
    text_proc = re.sub(r'(?i)\bkiller\s+upgrade\b', 'killer-upgrade', text_proc)
    text_proc = re.sub(r'(?i)\bbuttery\s+smooth\b', 'buttery-smooth', text_proc)
        
    # VADER overall sentiment
    scores = analyzer.polarity_scores(text_proc)
    compound = scores['compound']
    
    if compound >= 0.05:
        label = "Positive"
    elif compound <= -0.05:
        label = "Negative"
    else:
        label = "Neutral"

    # Split into sentences for aspect sentiment
    sentences = re.split(r'[.!?]+', text_proc)
    
    aspect_scores = defaultdict(list)
    word_freq = defaultdict(int)
    
    for sentence in sentences:
        sentence = sentence.strip().lower()
        if not sentence:
            continue
            
        sentence_scores = analyzer.polarity_scores(sentence)
        sentence_compound = sentence_scores['compound']
        
        words = re.findall(r'\b\w+\b', sentence)
        for word in words:
            if word not in STOP_WORDS and len(word) > 2 and not word.isdigit():
                word_freq[word] += 1
                
        # Aspect detection
        for aspect, keywords in ASPECTS.items():
            if any(kw in sentence for kw in keywords):
                aspect_scores[aspect].append(sentence_compound)

    # Average aspect sentiments
    final_aspects = {}
    for aspect, score_list in aspect_scores.items():
        avg_score = sum(score_list) / len(score_list)
        if avg_score >= 0.05:
            aspect_label = "Positive"
        elif avg_score <= -0.05:
            aspect_label = "Negative"
        else:
            aspect_label = "Neutral"
            
        final_aspects[aspect] = {
            "score": round(avg_score, 3),
            "label": aspect_label
        }
        
    # Top keywords
    sorted_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:10]
    top_keywords = [{"word": w, "count": c} for w, c in sorted_keywords]
    
    return {
        "label": label,
        "score": round(compound, 3),
        "aspects": final_aspects,
        "keywords": top_keywords
    }

def enrich_review(review):
    """Takes a normal review dict and returns an enriched one."""
    text = review.get('review_text', '')
    title = review.get('review_title', '')
    
    full_text = f"{title}. {text}"
    
    analysis = analyze_sentiment(full_text)
    
    review['sentiment'] = analysis['label']
    review['sentiment_score'] = analysis['score']
    review['aspects'] = analysis['aspects']
    review['keywords'] = analysis['keywords']
    review['is_enriched'] = True
    
    return review
