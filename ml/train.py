from ultralytics import YOLO


model = YOLO('yolov8s.pt')

model.train(
    data='dataset/dataset.yaml',
    epochs=50,
    imgsz=640,
    batch=8,
    name='tuneai',
    patience=20,
    lr0=0.01,
    augment=True,
)
