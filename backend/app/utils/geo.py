from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Point


def point_from_lat_lng(lat: float, lng: float) -> str:
    return from_shape(Point(lng, lat), srid=4326)


def lat_lng_from_point(point) -> tuple[float, float]:
    shape = to_shape(point)
    return shape.y, shape.x
