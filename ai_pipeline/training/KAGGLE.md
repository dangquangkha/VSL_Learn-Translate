# Train trên Kaggle

Repo là **PUBLIC** nên notebook clone thẳng được. Chỉ có **dữ liệu** cần tải lên,
vì `data/` nằm trong `.gitignore` (clip landmark của người thật — không commit).

---

## 1. Tải dữ liệu lên Kaggle (làm một lần)

File đã đóng gói sẵn: **`Downloads/vsl-data-kaggle.zip`** (10,7 MB · 295 clip).

Cấu trúc bên trong đúng thứ `train.py` cần:

```
P02/p2__bo__20260820T155306075Z.vslm
P03/P3__bo__20260820T130448471Z.vslm
P04/P04__bo__20260820T153018093Z.vslm
P05/P05__bo__20260820T154310940Z.vslm
```

Các bước:

1. Vào <https://www.kaggle.com/datasets> → **New Dataset**
2. Kéo thả `vsl-data-kaggle.zip` (Kaggle tự giải nén)
3. Đặt tên **`vsl-landmarks`** → **Create**
4. Để **Private** — đây là dữ liệu quay của người thật

Sau đó dữ liệu nằm ở `/kaggle/input/vsl-landmarks/`.

> Nếu đặt tên khác thì sửa `DATA` trong ô lệnh bên dưới cho khớp.

---

## 2. Notebook — dán nguyên ô này

Tạo notebook mới → **Add Input** → chọn dataset `vsl-landmarks` → dán:

```python
# Neu nhanh feat/p1-dataset-va-train CHUA merge vao main, them: -b feat/p1-dataset-va-train
!git clone -q https://github.com/dangquangkha/VSL_Learn-Translate /kaggle/working/vsl
%cd /kaggle/working/vsl

DATA = "/kaggle/input/vsl-landmarks"

# Kiem tra du lieu truoc khi train
!PYTHONPATH=. python -c "from ai_pipeline.training.dataset import scan_clips, summarize; print(summarize(scan_clips('$DATA', keep_signs=['idle','chao','xin_loi','tam_biet','bo','me'])))"
```

Rồi ô tiếp theo để train:

```python
# Chia theo NGUOI — con so that, dung de bao cao
!PYTHONPATH=. python -m ai_pipeline.training.train \
    --data-dir $DATA \
    --test-participants P02 \
    --epochs 60 \
    --out /kaggle/working/vsl_v3_testP02.pt \
    --report /kaggle/working/report_testP02.json
```

**Không cần GPU.** Model chỉ 79.923 tham số, ~980 cửa sổ; trên CPU laptop 60 epoch
mất khoảng 1 phút. Bật GPU cũng không sai, chỉ là không cần.

---

## 3. Các tham số đáng đổi

| Cờ | Mặc định | Ghi chú |
|---|---|---|
| `--test-participants` | *(rỗng)* | Rỗng = **chia trộn theo cửa sổ**. Con số sẽ ~97% nhưng **VÔ NGHĨA** — cửa sổ cùng một clip giống nhau ~98% nên nằm cả hai bên. Chỉ dùng để kiểm tra pipeline chạy. |
| `--signs` | `idle chao xin_loi tam_biet bo me` | 6 lớp đã chốt |
| `--epochs` | 60 | |
| `--lr` | 1e-3 | |
| `--report` | *(tắt)* | Ghi kết quả ra JSON |

Ba phép chia theo người dùng được với dữ liệu hiện tại:

```bash
--test-participants P02   # test co bo, me, tam_biet, xin_loi  (4/6 lop)
--test-participants P05   # test chi co bo, me                 (2/6 lop)
--test-participants P04   # KHONG DUNG DUOC: train se mat sach idle va chao
```

`P03` không có clip nào đạt nên không nằm trong danh sách.

---

## 4. Đọc kết quả cho đúng

Model xuất **51 logits** (giữ nguyên contract với P2/P4), nhưng chỉ 6 lớp có dữ
liệu. Độ chính xác chỉ tính trên các lớp xuất hiện trong tập test.

Hai con số script in ra:

- **`DO CHINH XAC TONG`** — model ở **epoch cuối**. Đây là con số dùng để báo cáo.
- **`Epoch tot nhat tung dat`** — chỉ để biết model có dao động mạnh không.
  **Không được lấy con số này đi báo cáo**: chọn epoch theo tập test là rò rỉ
  thông tin test vào việc chọn model, và nó luôn đẹp hơn thực tế (đo được: 84,1%
  so với 58,1% thật).

---

## 5. Kết quả đo tại chỗ ngày 2026-08-20 (để đối chiếu)

124/295 clip dùng được, 3 người (P02 40 · P04 67 · P05 17).

| Phép chia | Tổng | Chi tiết theo lớp |
|---|---|---|
| `test = P02` | **58,1%** | `bo` 87,5% · `me` 83,3% · `xin_loi` 25,0% · `tam_biet` 14,6% |
| `test = P05` | **63,2%** | `bo` 79,5% · `me` 33,3% |
| trộn theo cửa sổ | 96,9% | *(vô nghĩa — xem mục 3)* |

Quan hệ rất rõ và đó là điều quan trọng nhất rút ra được:

| Số người có lớp đó trong tập train | Độ chính xác với người lạ |
|---|---|
| 3 người (`bo`, `me`) | **80–88%** |
| 2 người (`tam_biet`, `xin_loi`) | **15–25%** |
| 1 người (`chao`, `idle`) | không đo được — mọi phép chia đều hỏng |

Nút thắt là **số người mỗi lớp**, không phải số clip và cũng không phải kiến trúc
model. Thêm người thứ 4 cho `chao` và `idle` có giá trị hơn hẳn mọi việc chỉnh
siêu tham số.
