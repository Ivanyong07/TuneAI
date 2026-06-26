from ultralytics import YOLO

model = YOLO('yolov8n.pt')

model.train(
    data='Guitar-4/data.yaml',
    epochs=50,
    imgsz=640,
    batch=16,
    name='tuneai'
)
