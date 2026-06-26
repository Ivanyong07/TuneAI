from roboflow import Roboflow

rf = Roboflow(api_key="ekhT03tWNauwKTNgLGcQ")
project = rf.workspace("uas-ai-2024").project("guitar-7rciy")
version = project.version(4)
dataset = version.download("yolov8")
