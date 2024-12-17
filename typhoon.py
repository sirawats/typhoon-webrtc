from transformers import AutoModel
import torch
import soundfile as sf
import librosa

# Initialize from the trained model
model = AutoModel.from_pretrained(
    "scb10x/llama-3-typhoon-v1.5-8b-audio-preview", 
    torch_dtype=torch.float16,
    trust_remote_code=True
)
# model.to("cuda")
model.eval()

# read a wav file (it needs to be in 16 kHz and clipped to 30 seconds)
audio, sr = sf.read("BTS-sound.mp3")
if len(audio.shape) == 2:
    audio = audio[:, 0]
if len(audio) > 30 * sr:
    audio = audio[: 30 * sr]
if sr != 16000:
    audio = librosa.resample(audio, orig_sr=sr, target_sr=16000, res_type="fft")

# Run generation
prompt_pattern="<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n\n<Speech><SpeechHere></Speech> {}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
response = model.generate(
    audio=audio,
    prompt="transcribe this audio",
    prompt_pattern=prompt_pattern,
    do_sample=False,
    max_new_tokens=512,
    repetition_penalty=1.1,
    num_beams=1,
    # temperature=0.4,
    # top_p=0.9,
)
print(response)

